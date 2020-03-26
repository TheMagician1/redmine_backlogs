# Redmine - project management software
# Copyright (C) 2006-2016  Jean-Philippe Lang
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
include RbCommonHelper

class RbSprintsRoadmapController < RbApplicationController
  menu_item :rb_sprints
  model_object RbSprint

  accept_api_auth :index, :show, :create, :update, :destroy

  helper :custom_fields
  helper :projects
  helper :versions

  def index
    respond_to do |format|
      format.html {
        @trackers = Tracker.where(id: RbStory.trackers(project: @project).map(&:to_i)).sorted.to_a
        retrieve_selected_tracker_ids(@trackers, @trackers.select {|t| t.is_in_roadmap?})
        @with_subprojects = params[:with_subprojects].nil? ? Setting.display_subprojects_issues? : (params[:with_subprojects] == '1')
        project_ids = @with_subprojects ? @project.self_and_descendants.collect(&:id) : [@project.id]

        sprints = @project.open_shared_sprints
        unless params[:completed]
          @completed_sprints = @project.closed_shared_sprints
        else
          sprints += @project.closed_shared_sprints
        end

        @stories_by_sprint = {}
        if @selected_tracker_ids.any? && sprints.any?
          @stories_by_sprint = RbStory.backlogs_by_sprint(@project, sprints)
        end
      }
    end
  end

  def show
    respond_to do |format|
      format.html {
        @stories = @sprint.stories
      }
    end
  end

  def new
    @sprint = RbSprint.new
    @sprint.safe_attributes = params[:rb_sprint]

    respond_to do |format|
      format.html
      format.js
    end
  end

  def create
    @sprint = RbSprint.new
    @sprint.project_id = @project.id
    if params[:rb_sprint]
      attributes = params[:rb_sprint].dup
      attributes.delete('sharing') unless attributes.nil? || @sprint.allowed_sharings.include?(attributes['sharing'])
      @sprint.safe_attributes = attributes
    end

    if request.post?
      if @sprint.save
        respond_to do |format|
          format.html do
            flash[:notice] = l(:notice_successful_create)
            redirect_back_or_default settings_project_path(@project, tab: 'versions')
          end
          format.js
          format.api do
            render action: 'show', status: :created, location: rb_sprint_path(@sprint)
          end
        end
      else
        respond_to do |format|
          format.html { render action: 'new' }
          format.js   { render action: 'new' }
        end
      end
    end
  end

  def edit
  end

  def update
    if params[:rb_sprint]
      attributes = params[:rb_sprint].dup
      attributes.delete('sharing') unless @sprint.allowed_sharings.include?(attributes['sharing'])
      @sprint.safe_attributes = attributes
      if @sprint.save
        respond_to do |format|
          format.html {
            flash[:notice] = l(:notice_successful_update)
            redirect_back_or_default settings_project_path(@project, tab: 'versions')
          }
        end
      else
        respond_to do |format|
          format.html { render action: 'edit' }
        end
      end
    end
  end

  def close_completed
    if request.put?
      @project.close_completed_versions
    end
    redirect_to settings_project_path(@project, tab: 'versions')
  end

  def destroy
    if @sprint.deletable?
      @sprint.destroy
      respond_to do |format|
        format.html { redirect_back_or_default settings_project_path(@project, tab: 'versions') }
      end
    else
      respond_to do |format|
        format.html {
          flash[:error] = l(:notice_unable_delete_version)
          redirect_to settings_project_path(@project, tab: 'versions')
        }
     end
    end
  end

  def status_by
    respond_to do |format|
      format.html { render action: 'show' }
      format.js
    end
  end

  private

  def retrieve_selected_tracker_ids(selectable_trackers, default_trackers=nil)
    if ids = params[:tracker_ids]
      @selected_tracker_ids = (ids.is_a? Array) ? ids.collect { |id| id.to_i.to_s } : ids.split('/').collect { |id| id.to_i.to_s }
    else
      @selected_tracker_ids = (default_trackers || selectable_trackers).collect {|t| t.id.to_s }
    end
  end
end
