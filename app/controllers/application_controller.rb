class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  # /?q=asdf
  def index
    PgSearch.multisearch(params[:q]) if params[:q].present?
  end
end
