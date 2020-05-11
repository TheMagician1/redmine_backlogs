class AddUseEpicboardProjectSetting < ActiveRecord::Migration[5.2]
  def self.up
    add_column :rb_project_settings, :use_epicboard, :boolean, {default: true, null: false}
  end

  def self.down
    remove_column :rb_project_settings, :use_epicboard
  end
end

