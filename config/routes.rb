Resonate::Application.routes.draw do
  root :to => "application#index"

  resources :organisations
  resources :search_results, only: :index

  devise_for :users
end
