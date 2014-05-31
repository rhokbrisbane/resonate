class AddAttachmentCoverPhotoToOrganisations < ActiveRecord::Migration
  def self.up
    change_table :organisations do |t|
      t.attachment :cover_photo
    end
  end

  def self.down
    drop_attached_file :organisations, :cover_photo
  end
end
