class RbTeam < Group
  unloadable
  def position
    0
  end
end

class RbFakeGeneric
  attr_accessor :subject
  def initialize(subject)
    @subject = subject
  end
  def name
    subject
  end
  def to_s
    subject
  end
  def id
    0
  end
end


class RbGenericboard < ActiveRecord::Base
  include Redmine::SafeAttributes
  attr_accessible :col_type, :element_type, :name, :prefilter, :colfilter, :rowfilter, :row_type

  private

  def resolve_scope(object_type, project, options={})
    case object_type
    when '__sprint'
      project.open_shared_sprints
    when '__release'
      project.open_releases_by_date
    when '__team'
      Group.order(:lastname).map {|g| g.becomes(RbTeam) }
    else #assume an id of tracker, see our options in helper
      tracker_id = object_type
      return RbGeneric.visible.order("#{RbGeneric.table_name}.position").
        backlog_scope(
          options.dup.merge({
            :project => project,
            :trackers => resolve_trackers(tracker_id)
        }))
    end
  end

  def resolve_trackers(object_type)
    if object_type.start_with?('__')
      return nil
    end
    RbGeneric.all_trackers(Tracker.find(object_type).id)
  end

  def resolve_parent_attribute(object_type)
    case object_type
    when '__sprint'
      :sprint
    when '__release'
      :release
    when '__team'
      :team
    else
      :parent
    end

  end

  public

  safe_attributes 'name',
    'element_type',
    'row_type',
    'col_type',
    'prefilter',
    'rowfilter',
    'colfilter'

  def to_s
    name
  end

  def type_name(object_type)
    case object_type
    when '__sprint'
      "Sprint"
    when '__release'
      "Release"
    when '__team'
      "Team"
    else #assume an id of tracker, see our options in helper
      tracker_id = object_type
      tracker = Tracker.find(tracker_id)
      if tracker
        tracker.name
      else
        "unknown"
      end
    end
  end

  def row_type_name
    type_name(row_type)
  end

  def col_type_name
    type_name(col_type)
  end

  def columns(project, options={})
    if col_type != element_type
      resolve_scope(col_type, project, options)
    else #fake generic
      [ RbFakeGeneric.new("#{col_type_name}") ]
    end
  end

  def rows(project, options={})
    resolve_scope(row_type, project, options)
  end

  def elements(project, options={})
    resolve_scope(element_type, project, options)
  end

  def elements_by_cell(project)
    puts ""
    puts "types: #{col_type} #{element_type}"
    parent_attribute = resolve_parent_attribute(row_type)
    if col_type != element_type
      column_attribute = resolve_parent_attribute(col_type)
      puts "types differ, have attribute #{column_attribute}"
    else
      puts "types equal, no columns"
      column_attribute = nil
      col_id = 0
    end

    map = {}
    elements(project).each {|element|
      puts "Checkint element", element
      row_id = element.send(parent_attribute)
      unless row_id.nil?
        row_id = row_id.id
      else
        row_id = 0
      end

      unless column_attribute.nil?
        col_id = element.send(column_attribute)
        unless col_id.nil?
          col_id = col_id.id
        else
          col_id = 0
        end
      end
      puts "r/c #{row_id} #{col_id}"
      unless map.include? row_id
        map[row_id] = {}
      end
      unless map[row_id].include? col_id
        map[row_id][col_id] = []
      end
      map[row_id][col_id].append(element)
    }
    map
  end

end