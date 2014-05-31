class AddShortUrlDataToOrganisations < ActiveRecord::Migration
  def change
  	add_column :organisations, :short_url, :string
  	add_column :organisations, :long_url, :string
  	add_column :organisations, :qr_code, :string
  	add_column :organisations, :info, :string
  end
end
