class CreateRbGenericboards < ActiveRecord::Migration[5.2]
  def change
    create_table :rb_genericboards do |t|
      t.string :name
      t.text :prefilter
      t.text :rowfilter
      t.text :colfilter
      t.text :row_type
      t.text :col_type
      t.string :element_type

      t.timestamps
    end
  end
end
