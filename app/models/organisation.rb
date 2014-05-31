class Organisation < ActiveRecord::Base
  include PgSearch

  self.per_page = 50

  has_attached_file :cover_photo,
    :styles => { :medium => "300x300>", :thumb => "100x100>" },
    :default_url => "/images/:style/missing.png"

  validates_attachment_content_type :cover_photo, :content_type => /\Aimage\/.*\Z/

  multisearchable against: %w(name description email phone address city state post_code country category mission slug)

end
