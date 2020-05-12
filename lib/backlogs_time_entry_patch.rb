require_dependency 'time_entry'

module Backlogs
  module TimeEntryPatch
    def self.included(base) # :nodoc:
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable

        after_save :touch_task

      end
    end

    module ClassMethods
    end

    module InstanceMethods
      def touch_task
        self.issue.touch
      end

    end
  end
end

TimeEntry.send(:include, Backlogs::TimeEntryPatch) unless Version.included_modules.include? Backlogs::TimeEntryPatch
