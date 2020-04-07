require "./plugins/redmine_backlogs/db/migrate/040_add_release_id_to_issues.rb"
require "./plugins/redmine_backlogs/db/migrate/044_add_release_relationship_to_issues.rb"
require "./plugins/redmine_backlogs/db/migrate/048_add_issues_release_day_cache.rb"

class RemoveReleaseIdFromIssues < ActiveRecord::Migration[5.2]
  def self.up
    #disable release_id in issues
    AddReleaseIdToIssues.new.down
    #disable release day cache
    AddIssuesReleaseDayCache.new.down
    #disable release relationship
    AddReleaseRelationshipToIssues.new.down
  end

  def self.down
    #enable release_id in issues
    AddReleaseIdToIssues.new.up
    #disable release day cache
    AddIssuesReleaseDayCache.new.up
    #enable release relationship
    AddReleaseRelationshipToIssues.new.up
  end
end
