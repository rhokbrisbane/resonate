Resonate::Application.routes.draw do
  devise_for :users # , ActiveAdmin::Devise.config
  resources :search_results, only: :index
  resources :organisations

  get '/org/:slug', to: 'organisations#org'

  root :to => "application#index"
  ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)
end
