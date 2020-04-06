class AddDefaultSprintRelease < ActiveRecord::Migration[5.2]
  def self.up
    unless ActiveRecord::Base.connection.column_exists?(:versions, :release_id)
      add_column :versions, :release_id, :integer
      add_column :versions, :story_points, :float
    end
  end

  def self.down
    remove_column :versions, :story_points
    remove_column :versions, :release_id
  end
end
