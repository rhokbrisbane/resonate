class AddUserToOrganization < ActiveRecord::Migration
  def change
    add_column :organisations, :user_id, :integer, index: true
  end
end
