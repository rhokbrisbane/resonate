class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  def index
  end

  private
  def authenticate_admin_user!
    authenticate_user! && current_user.admin?
  end
end
