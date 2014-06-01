server '54.79.12.205', :app, :web, :db, :primary => true

set :branch, 'deploy'
set :rack_env, 'production'
set :rails_env, 'production'
set :application, "resonate-#{rails_env}"
