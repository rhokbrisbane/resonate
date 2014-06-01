json.array!(@organisations) do |organisation|
  json.extract! organisation, :id, :name, :description, :cover_photo, :email, :phone, :address, :city, :state, :post_code, :country, :latitude, :longitude, :category, :slug
  json.url organisation_url(organisation, format: :json)
end
