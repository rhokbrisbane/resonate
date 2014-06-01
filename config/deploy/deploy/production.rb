server '54.79.62.60', :app, :web, :db, :primary => true

set :branch, 'master'
set :rack_env, 'production'
set :rails_env, 'production'
set :application, "kidzcanzimbabwe-#{rails_env}"
