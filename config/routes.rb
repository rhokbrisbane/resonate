Resonate::Application.routes.draw do
  root :to => "application#index"

  resources :search_results, only: :index
  resources :organisations
  get '/org/:slug', to: 'organisations#org'

  devise_for :users
end
