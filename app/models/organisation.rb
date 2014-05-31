class Organisation < ActiveRecord::Base
  include PgSearch

  self.per_page = 50

  has_attached_file :cover_photo,
    :styles => { :medium => "300x300>", :thumb => "100x100>" },
    :default_url => "/images/:style/missing.png"

  validates_attachment_content_type :cover_photo, :content_type => /\Aimage\/.*\Z/

  multisearchable against: %w(name description email phone address city state post_code country category mission slug)

  # geocoded_by :address
  # after_validation :geocode, if: :location_changed?

  def to_s
    name
  end

  # def address
  #   [address, city, state, country].compact.join(', ')
  # end

  # def coordinates
  #   [latitude, longitude]
  # end

  # def coordinates?
  #   coordinates.join.present?
  # end

  # def location_changed?
  #   if persisted?
  #     (changed & %w(address city state post_code country)).any?
  #   else
  #     !coordinates?
  #   end
  # end
end
