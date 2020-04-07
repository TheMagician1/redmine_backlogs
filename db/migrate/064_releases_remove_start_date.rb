class ReleasesRemoveStartDate < ActiveRecord::Migration[5.2]
  def self.up
    remove_columns :releases, :release_start_date
  end
  def self.down
    add_column :releases, :release_start_date, :date, null: false
  end
end
