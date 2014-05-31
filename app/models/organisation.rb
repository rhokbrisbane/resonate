class Organisation < ActiveRecord::Base
  include PgSearch

  self.per_page = 50

  has_attached_file :cover_photo,
    :styles => { :medium => "300x300>", :thumb => "100x100>" },
    :default_url => "/images/:style/missing.png"

  validates_attachment_content_type :cover_photo, :content_type => /\Aimage\/.*\Z/

  multisearchable against: %w(name description email phone address city state post_code country category mission slug)

  after_validation :geocode, if: :location_changed?

  geocoded_by :address

  def to_s
    name
  end


  def address
    [street1, street2, suburb, state, country].compact.join(', ')
  end

  def coordinates
    [latitude, longitude]
  end

  def coordinates?
    coordinates.join.present?
  end

  def location_changed?
    if persisted?
      (changed & %w(street1 street2 suburb state country)).any?
    else
      !coordinates?
    end
  end
end
