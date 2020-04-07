class AddTeamToSprint < ActiveRecord::Migration[5.2]
  def self.up
    unless ActiveRecord::Base.connection.column_exists?(:versions, :rbteam_id)
      add_column :versions, :rbteam_id, :integer
    end
  end

  def self.down
    remove_column :versions, :rbteam_id
  end
end
