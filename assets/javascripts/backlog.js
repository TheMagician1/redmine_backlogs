/******************************************
  BACKLOG
  A backlog is a visual representation of
  a sprint and its stories. It's is not a
  sprint. Imagine it this way: a sprint is
  a start and end date, and a set of
  objectives. A backlog is something you
  would draw up on the board or a spread-
  sheet (or in Redmine Backlogs!) to
  visualize the sprint.
******************************************/

RB.Backlog = RB.Object.create({

  initialize: function(el){
    var j;  // This ensures that we use a local 'j' variable, not a global one.
    var self = this;

    this.$ = j = RB.$(el);
    this.el = el;

    // Associate this object with the element for later retrieval
    j.data('this', this);

    // Make the list sortable
    if (RB.permissions.update_stories) {
    list = this.getList();
    list.bind('mousedown', function(e){self.mouseDown(e);});
    list.bind('mouseup', function(e){self.mouseUp(e);});
    list.sortable({connectWith: '.stories',
                   placeholder: 'placeholder',
                   forcePlaceholderSize: true,
                   dropOnEmpty: true,
                   distance: 3,
                   helper: 'clone', //workaround firefox15+ bug where drag-stop triggers click
                   cancel: '.editing',
                   start: this.dragStart,
                   stop: function(e,u){ self.dragStop(e, u); },
                   update: function(e,u){ self.dragComplete(e, u); }
                  });
    } //permissions

    if(this.isSprintBacklog()){
      RB.Factory.initialize(RB.Sprint, this.getSprint());
    }

    this.drawMenu();

    // Initialize each item in the backlog
    this.getStories().each(function(index){
      story = RB.Factory.initialize(RB.Story, this); // 'this' refers to an element with class="story"
    });

    this.getEpics().each(function(index){
      story = RB.Factory.initialize(RB.Epic, this); // 'this' refers to an element with class="epic"
    });

    this.recalcVelocity();
  },

  afterCreate: function(data, textStatus, xhr){
    this.drawMenu();
  },

  afterUpdate: function(data, textStatus, xhr){
    this.drawMenu();
  },

  drawMenu: function()
  {
    var menu = this.$.find('ul.items');
    var id = null;
    var self = this;
    var ajaxdata = {};
    if (this.isSprintBacklog()) {
      id = this.getSprint().data('this').getID();
      ajaxdata = { sprint_id: id };
    }
    // else id = null // product backlog
    if (id === "") { return; } // template sprint

    var createMenu = function(data, list)
    {
      list.empty();
      if (data) {
        for (var i = 0; i < data.length; i++) {
          li = RB.$('<li class="item"><a href="#"></a></li>');
          a = RB.$('a', li);
          a.attr('href', data[i].url).text(data[i].label);
          if (data[i].classname) { a.attr('class', data[i].classname); }
          if (data[i].warning) {
            a.data('warning', data[i].warning);
            a.click(function(e) {
              if (e.button > 1) return;
              return confirm(RB.$(this).data('warning').replace(/\\n/g, "\n"));
            });
          }
          list.append(li);
        }
      }
    };


    RB.ajax({
      url: RB.routes.backlog_menu,
      data: ajaxdata,
      dataType: 'json',
      success   : function(data,t,x) {
        createMenu(data, menu);

        // Loop through all the <li> elements to see if
        // one of them has a submenu
        menu.find('li').each(function(i, element) {
          if(data[i].sub) {
            // Add an arrow
            RB.$(element).append('<div class="icon ui-icon ui-icon-carat-1-e"></div>');
            // Add a sublist
            RB.$(element).append('<ul></ul>');
            createMenu(data[i].sub, RB.$('ul', element));
          }
        });

        if (RB.permissions.create_stories) {
          menu.find('.add_new_story').bind('mouseup', self.handleNewStoryClick);
        }
        if (RB.permissions.create_epics) {
          menu.find('.add_new_epic').bind('mouseup', self.handleNewEpicClick);
        }
        if (RB.permissions.create_sprints) {
          menu.find('.add_new_sprint').bind('mouseup', self.handleNewSprintClick);
        }
        // capture 'click' instead of 'mouseup' so we can preventDefault();
        menu.find('.show_burndown_chart').bind('click', function(ev){ self.showBurndownChart(ev); });
      }
    });
  },

  enableNewSprintAsDropTarget: function() {
    if (!this.isSprintBacklog()) { return; }

    var sprintIdAttr = this.getSprint().attr('id'); // 'sprint_123'
    var sprintId = sprintIdAttr.split('_').pop();

    // Put new sprint id into this array of valid drop targets
    RB.constants.project_versions[RB.constants.project_id].push(sprintId);

    // Append sprint id to the story container's id end, because it is needed to be a valid DnD target
    var storyContainer = this.getList();
    var storyContainerIdPrefix = storyContainer.attr('id'); // 'stories-for-'
    storyContainer.attr('id', storyContainerIdPrefix + sprintId); // 'stories-for-123'
  },

  dragComplete: function(event, ui) {
    // jQuery triggers dragComplete of source and target.
    // Thus we have to check here. Otherwise, the story
    // would be saved twice.
    if(!ui.sender && ui.item.data('dragging')){
      ui.item.data('this').saveDragResult();
    }

    this.recalcVelocity();
    this.drawMenu();
  },

  mouseDown: function(event) {
    var i;
    var item = RB.$(event.target).parents('.model');
    var storyProject = item.find(".story_project").text();

    // disable invalid drag targets
    RB.$('#sprint_backlogs_container .stories').sortable('disable');
    // Always allow DnD on sprints shared system wide.
    RB.$('#sprint_backlogs_container .shared-system-wide .stories').sortable('enable');
    if (RB.constants.project_versions[storyProject]) {
      for (i = 0; i < RB.constants.project_versions[storyProject].length; i++) {
        RB.$('#stories-for-' + RB.constants.project_versions[storyProject][i]).sortable('enable');
      }
    }

    //Enable new sprints
    RB.$('#stories-for-').sortable('enable');

    //get the ui hint up to the header
    RB.$('.ui-sortable-disabled').parent('.backlog').addClass('rb-sortable-disabled');

    // disable locked sprints
    RB.$('.stories.locked').sortable('disable');
  },

  mouseUp: function(event) {
    this.enableAllSortables();
  },

  dragStart: function(event, ui) {
    ui.item.addClass("dragging");
    ui.item.data('dragging', 'true');
  },

  dragBeforeStop: function(event, ui){ //FIXME what does this function do?
    var dropTarget = ui.item.parents('.backlog').data('this');

    // always allowed to go back to the product backlog
    // actually, this is not true for sharing, but in that case the pbl should be disabled for sortable FIXME (pa sharing) needs proper implementation
    if (!dropTarget.isSprintBacklog()) { return; }

    var targetSprint = dropTarget.getSprint().data('this').getID();
    var storyProject = ui.item.find(".story_project").text();

    var validDrop = true;
    validDrop = validDrop && RB.constants.project_versions[storyProject];
    validDrop = validDrop && (RB.$.inArray(targetSprint, RB.constants.project_versions[storyProject]) >= 0);

    if (validDrop) { return; }

    ui.item.removeData('dragging');
  },

  dragStop: function(event, ui) {
    ui.item.removeClass("dragging");
    this.enableAllSortables();
  },

  enableAllSortables: function() {
    // enable all backlogs as drop targets
    RB.$('.stories').sortable('enable');
    RB.$('.rb-sortable-disabled').removeClass('rb-sortable-disabled');
  },

  getSprint: function(){
    return RB.$(this.el).find(".model.sprint").first();
  },

  getStories: function(){
    return this.getList().children(".story");
  },

  getEpics: function(){
    return this.getList().children(".epic");
  },

  getList: function(){
    return this.$.children(".stories").first();
  },

  handleNewStoryClick: function(event){
    if(event.button > 1) return;
    event.preventDefault();

    var project_id = null;
    var project_id_class = RB.$(this).attr('class').match(/project_id_([0-9]+)/);
    if(project_id_class && project_id_class.length == 2) {
      project_id = project_id_class[1];
    }

    RB.$(this).parents('.backlog').data('this').newStory(project_id);
  },

  handleNewEpicClick: function(event){
    if(event.button > 1) return;
    event.preventDefault();

    var project_id = null;
    var project_id_class = RB.$(this).attr('class').match(/project_id_([0-9]+)/);
    if(project_id_class && project_id_class.length == 2) {
      project_id = project_id_class[1];
    }

    RB.$(this).parents('.backlog').data('this').newEpic(project_id);
  },

  handleNewSprintClick: function(event){
    if(event.button > 1) return;
    event.preventDefault();
    RB.$(this).parents('.backlog').data('this').newSprint();
    if (RB.BacklogOptionsInstance) RB.BacklogOptionsInstance.showSprintPanel();
  },

  isSprintBacklog: function(){
    return RB.$(this.el).find('.sprint').length > 0; // return true if backlog has an element with class="sprint"
  },

  isReleaseBacklog: function(){
    return RB.$(this.el).find('.release').length > 0; // return true if backlog has an element with class="release"
  },

  newStory: function(project_id) {
    var story = RB.$('#story_template').children().first().clone();
    if(project_id) {
      RB.$('#project_id_options').empty();
      RB.$('#project_id_options').append('<option value="'+project_id+'">'+project_id+'</option>');
    }

    if (RB.constants.new_story_position == 'bottom') {
      this.getList().append(story);
    } else {
      this.getList().prepend(story);
    }
    o = RB.Factory.initialize(RB.Story, story[0]);
    o.edit();
    story.find('.editor' ).first().focus();
    RB.$('html,body').animate({
        scrollTop: story.find('.editor').first().offset().top-100
        }, 200);
  },

  newEpic: function(project_id) {
    var epic = RB.$('#epic_template').children().first().clone();
    if(project_id) {
      RB.$('#project_id_options').empty();
      RB.$('#project_id_options').append('<option value="'+project_id+'">'+project_id+'</option>');
    }

    if (RB.constants.new_story_position == 'bottom') {
      this.getList().append(epic);
    } else {
      this.getList().prepend(epic);
    }
    o = RB.Factory.initialize(RB.Epic, epic[0]);
    o.edit();
    epic.find('.editor' ).first().focus();
    RB.$('html,body').animate({
        scrollTop: epic.find('.editor').first().offset().top-100
        }, 200);
  },

  newSprint: function(){
    var sprint_backlog = RB.$('#sprint_template').children().first().clone();

    RB.$("*#sprint_backlogs_container").append(sprint_backlog);
    o = RB.Factory.initialize(RB.Backlog, sprint_backlog);
    o.edit();
    sprint_backlog.find('.editor' ).first().focus();
    RB.$('html,body').animate({
        scrollTop: sprint_backlog.find('.editor').first().offset().top
        }, 200);
  },

  recalcVelocity: function(){
    var tracker_total = new Array();
    total = 0;
    this.getStories().each(function(index){
      var story = RB.$(this).data('this');
      if (!story) return; //some race condition with auto updater?
      var story_tracker = story.getTracker();
      total += RB.$(this).data('this').getPoints();
      if ('undefined' == typeof(tracker_total[story_tracker])) {
         tracker_total[story_tracker] = 0;
      }
      tracker_total[story_tracker] += story.getPoints();
    });
    var currentInSprint = this.updateseprator();

    var sprint_points = this.$.children('.header').find('.velocity');
    sprint_points.text(total);
    var tracker_summary = "<b>Tracker statistics</b><br />";
    for (var t in tracker_total) {
       tracker_summary += '<b>' + t + ':</b> ' + tracker_total[t] + '<br />';
    }
    tracker_summary += '<b>Within capacity:</b> ' + currentInSprint + '<br />';
    sprint_points.qtip('option', 'content.text', tracker_summary);
  },

  updateseprator: function(){
    var capacity = this.$.children().find(".capacity-point").text();
    var ularea = this.$.children('ul').children('li')
    ularea.each(function () {
      $(this).css('border-bottom','#AAAAAA 1px solid');
      $(this).css('border-top','');
    });
    var totalpoint = 0.0;
    if (capacity > 0){
      ularea.each(function () {
        var storypoint = RB.$(this).data('this').getPoints()
        var storyid = $(this).attr('story');
        if (!(storypoint === undefined || storypoint === null || (isNaN(storypoint)))) {
          curpoint = parseFloat(storypoint) || 0.0;
          totalpoint += curpoint;
          if(capacity < totalpoint && (totalpoint > 0.0)){
            totalpoint -= curpoint;
            if($("li#"+storyid).prev().length == 0) {
              $( "li#"+storyid).addClass("seperator-point").css('border-top','2px solid red');
            }
            else{
              $( "li#"+storyid).prev().addClass("seperator-point").css('border-bottom','2px solid red');
            }
            return false;
          }
        }
      });
    }
    return totalpoint;
  },

  showBurndownChart: function(event){
    event.preventDefault();
    if (RB.$("#charts").length === 0){
      RB.$( document.createElement("div") ).attr('id', "charts").appendTo("body");
    }
    RB.$('#charts').html( "<div class='loading'>Loading data...</div>");
    RB.$('#charts').load( RB.urlFor('show_burndown_embedded', { id: this.getSprint().data('this').getID() }) );
    RB.$('#charts').dialog({
                          buttons: { "Close": function() { RB.$('#charts').dialog("close"); } },
                          height: 590,
                          modal: true,
                          title: 'Charts',
                          width: 710
                       });
  }
});
