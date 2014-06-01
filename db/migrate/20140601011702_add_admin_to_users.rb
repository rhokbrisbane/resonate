class AddAdminToUsers < ActiveRecord::Migration
  def migrate(direction)
    super

    User.create!(
      email:                 'admin@rhock.com',
      password:              'HackForerver123',
      password_confirmation: 'HackForerver123',
      admin: true
    ) if direction == :up
  end

  def change
    add_column :users, :admin, :boolean, default: false
  end
end
