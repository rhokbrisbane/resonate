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

  def qr_code_image_url
    to_use_url = self.short_url
    return "http://chart.googleapis.com/chart?cht=qr&chs=150x150&choe=UTF-8&chld=H&chl=#{to_use_url}"
  end

  def set_googl_attributes(url_to_shorten)
    url = Googl.shorten(url_to_shorten)
    if url != nil
      self.assign_attributes(short_url: url.short_url, long_url: url.long_url, info: url.info, qr_code: url.qr_code)
      self.save
    end 
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
