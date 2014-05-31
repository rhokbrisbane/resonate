Resonate::Application.routes.draw do
  root :to => "application#index"

  resources :organisations
  devise_for :users
end
