require_dependency 'my_controller'

module Backlogs
  module MyControllerPatch
    def self.included(base) # :nodoc:
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable # Send unloadable so it will not be unloaded in development
        after_action :save_backlogs_preferences, only: [:account]
      end
    end

    module ClassMethods
    end

    module InstanceMethods
      def save_backlogs_preferences
        if request.put? && flash[:notice] == l(:notice_account_updated)
          color = (params[:backlogs] ? params[:backlogs][:task_color] : '').to_s
          if color == '' || color.match(/^#[A-Fa-f0-9]{6}$/)
            User.current.backlogs_preference[:task_color] = color
          else
            flash[:notice] = "Invalid task color code #{color}"
          end
          front_color = (params[:backlogs] ? params[:backlogs][:task_front_color] : '').to_s
          if front_color == '' || color.match(/^#[A-Fa-f0-9]{6}$/)
            User.current.backlogs_preference[:task_front_color] = front_color
          else
            flash[:notice] = "Invalid task front color code #{front_color}"
          end
          hash = (params[:backlogs] || {})
          User.current.backlogs_preference[:show_backlog_story_color] = hash[:show_backlog_story_color]
          User.current.backlogs_preference[:show_assigned_to_full] = hash[:show_assigned_to_full]
          User.current.backlogs_preference[:show_assigned_to_short] = hash[:show_assigned_to_short]
          User.current.backlogs_preference[:show_category] =hash[:show_category]
        end
      end
    end
  end
end

MyController.send(:include, Backlogs::MyControllerPatch) unless MyController.included_modules.include? Backlogs::MyControllerPatch
