class AddMultipleReleasesPerIssue < ActiveRecord::Migration[5.2]
  def self.up
    create_table :rb_issue_releases do |t|
      t.references :issue
      t.references :release
    end
    add_index :rb_issue_releases, [:issue_id, :release_id], unique: true
  end

  def self.down
    drop_table :rb_issue_releases
  end
end
