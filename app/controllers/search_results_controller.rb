class SearchResultsController < ApplicationController
  # /?q=asdf
  def index
    @search_results = PgSearch.multisearch(params[:q])
  end
end
