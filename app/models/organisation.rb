class Organisation < ActiveRecord::Base
  include PgSearch

  # self.per_page = 50
  belongs_to :user, inverse_of: :organisation

  has_attached_file :cover_photo,
    :styles => { :medium => "300x300>", :thumb => "100x100>" },
    :default_url => "/images/:style/missing.png"

  validates_attachment_content_type :cover_photo, :content_type => /\Aimage\/.*\Z/
  validate :slug, uniqueness: true, presence: true

  multisearchable against: %w(name description email phone address city state post_code country category mission slug)

  before_create :set_googl_urls

  attr_accessor :root_url

  def to_s
    name
  end

  def qr_code_image_url(size = '150x150')
    "http://chart.googleapis.com/chart?cht=qr&chs=#{size}&choe=UTF-8&chld=H&chl=#{short_url}"
  end

  def set_googl_urls
    self.long_url = root_url + slug
    googl = Googl.shorten(long_url)
    if googl
      self.short_url = googl.short_url
      self.googl_analytics_url = googl.info
      self.qr_code_url = googl.qr_code
    end 
  end

  # geocoded_by :address
  # after_validation :geocode, if: :location_changed?

  # def address_1
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
