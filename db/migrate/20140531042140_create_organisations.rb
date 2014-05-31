class CreateOrganisations < ActiveRecord::Migration
  def change
    create_table :organisations do |t|
      t.string :name
      t.string :description
      t.text :cover_photo
      t.string :email
      t.string :phone
      t.string :address
      t.string :city
      t.string :state
      t.string :post_code
      t.string :country
      t.string :category
      t.text :mission
      t.string :slug

      t.timestamps
    end
  end
end
