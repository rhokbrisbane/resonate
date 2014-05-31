Resonate::Application.routes.draw do
  resources :search_results, only: :index
  resources :organisations

  get '/org/:slug', to: 'organisations#org'

  root :to => "application#index"

  devise_for :users
end
