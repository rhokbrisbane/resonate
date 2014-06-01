class AddShortUrlDataToOrganisations < ActiveRecord::Migration
  def change
  	add_column :organisations, :short_url, :string
  	add_column :organisations, :long_url, :string
  	add_column :organisations, :qr_code_url, :string
  	add_column :organisations, :googl_analytics_url, :string
  end
end
