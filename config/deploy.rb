set :stages, %w(production)
set :default_stage, "production"
set :whenever_environment, defer { stage }

require 'capistrano/ext/multistage'
require 'capistrano_colors'
require 'bundler/capistrano'

#############################################################
# Application
#############################################################
set :normalize_asset_timestamps, false
set :scm, :git
set :git_enable_submodules, true
set :repository,  "git@github.com:rhokbrisbane/resonate.git"
ssh_options[:forward_agent] = true

set :db_host, "localhost"
set :db_name, "resonate_production"
set :pg_user, "netengine"
set :pg_password, "uwppDkoJ27hJlmGRZVieYafdn"

set :use_sudo, true
set :keep_releases, 5

default_run_options[:pty] = true
set :runner, 'netengine'
set :user, 'netengine'
set :use_sudo, false

set :deploy_via, :remote_cache
set :git_shallow_clone, 1
set :copy_strategy, :export
set :deploy_to, '/var/www/unicorn'

set :assets_dependencies, %w(app/assets lib/assets vendor/assets Gemfile.lock config/routes.rb)

set :bundle_flags, "--deployment --quiet --binstubs"
set :default_environment, {
  'RBENV_ROOT' => '/home/netengine/.rbenv',
  'PATH' => "/var/www/unicorn/current/bin:/home/netengine/.rbenv/shims:/home/netengine/.rbenv/bin:$PATH"
}

after 'deploy:setup', 'db:setup', 'setup:hostname', 'setup:env', 'setup:postgresql'
after 'deploy:update_code','setup:unicorn', 'symlink:all'
after 'db:init', 'db:migrate', 'db:seed'
after 'deploy:restart', 'deploy:cleanup'
load 'deploy/assets'

namespace :deploy do
  task :start, :roles => :app, :except => { :no_release => true } do
    sudo "/etc/init.d/unicorn start"
  end

  task :stop, :roles => :app, :except => { :no_release => true } do
    sudo "/etc/init.d/unicorn stop"
  end

  task :restart, :roles => :app, :except => { :no_release => true } do
    deploy.upgrade
  end

  desc "Like restart but violent"
  task :upgrade, :roles => :app, :except => { :no_release => true } do
    sudo "/etc/init.d/unicorn upgrade"
  end

  namespace :web do
    task :disable, :roles => :web, :except => { :no_release => true } do
      require 'erb'
      on_rollback { run "rm #{shared_path}/system/maintenance.html" }

      put File.read('./public/maintenance.html'), "#{shared_path}/system/maintenance.html", :mode => 0644
    end
  end

  namespace :assets do
    task :precompile, :roles => :web, :except => { :no_release => true } do
      from = source.next_revision(current_revision)
      if releases.length <= 1 || capture("cd #{latest_release} && #{source.local.log(from)} vendor/assets/ app/assets/ | wc -l").to_i > 0
        run %Q{cd #{latest_release} && nice #{rake} RAILS_ENV=#{rails_env} #{asset_env} assets:precompile}
      else
        logger.info "Skipping asset pre-compilation because there were no asset changes"
      end
    end
  end
end

namespace :symlink do
  task :database, :roles => :app do
    run "ln -nfs #{deploy_to}/#{shared_dir}/config/database.yml #{release_path}/config/database.yml"
  end

  task :application_configs, :roles => :app do
    run "ln -nfs #{deploy_to}/#{shared_dir}/.env #{release_path}/.env"
  end

  task :assets, :roles => :app do
    run "ln -nfs #{deploy_to}/#{shared_dir}/system #{release_path}/public/system"
  end

  task :all, :roles => :app do
    database
    application_configs
    assets
  end
end


# Tasks for Database configuration
namespace :db do

  task :setup do
    template = <<-EOF
#{rails_env}:
  adapter: postgresql
  encoding: unicode
  host: #{Capistrano::CLI.ui.ask "Database host: "}
  database: #{db_name}
  username: #{pg_user}
  password: #{pg_password}
  pool: 30
    EOF

    run "mkdir -p  #{shared_path}/config"
    put template, "#{shared_path}/config/database.yml"
  end

  desc "Init Database"
  task :init, :roles => :db do
    puts "\n\n=== Creating the #{rails_env} Database! ===\n\n"
    run "cd #{current_path}; rake db:create RAILS_ENV=#{rails_env}"
  end

  desc "Migrate Database"
  task :migrate, :roles => :db do
    puts "\n\n=== Migrating the #{rails_env} Database! ===\n\n"
    run "cd #{current_path}; rake db:migrate RAILS_ENV=#{rails_env}"
  end

  desc "Seed Database"
  task :seed, :roles => :db do
    puts "\n\n=== Seeding the #{rails_env} Database! ===\n\n"
    run "cd #{current_path}; rake db:seed RAILS_ENV=#{rails_env}"
  end
end


# Server setup
namespace :setup do
  task :env do
    puts "\n\n=== Setup environment variables ===\n\n"
    sudo "bash -c \"echo 'RAILS_ENV=\\\"#{rails_env}\\\"' >> /etc/environment\""
  end

  task :authorized_keys do
    puts "\n\n=== Setup SSH athorized keys ===\n\n"
    run "git clone git@github.com:net-engine/dot-ssh.git /tmp/dot-ssh"
    run "head -n 1 ~/.ssh/authorized_keys > /tmp/dot-ssh/temp_file"
    run "cat /tmp/dot-ssh/authorized_keys >> /tmp/dot-ssh/temp_file"
    run "chmod 600 /tmp/dot-ssh/temp_file"
    run "mv /tmp/dot-ssh/temp_file ~/.ssh/authorized_keys"
    run "rm -rf /tmp/dot-ssh"
  end

  task :hostname do
    puts "\n\n=== Setup hostname ===\n\n"
    sudo "hostname #{application}"
    sudo "bash -c 'echo #{application} > /etc/hostname'"
    sudo "sed -i '1 s/^.*.$/127.0.0.1 localhost #{application}/g' /etc/hosts"
  end

  task :monit do
    puts "\n\n=== Setup monit ===\n\n"
    sudo "sed -i s/MONIT_ALERT_EMAIL@placeholder/#{monit_alert_email}/g /etc/monit/monitrc"
    sudo "sed -i '/# MONIT MAIL SERVER/{\
n; s/^.*.$/#{monit_mailserver}/\
}' /etc/monit/monitrc"
    sudo "sed -i s/HOSTNAME/$(hostname)/g /etc/monit/monitrc"
    sudo "chown -R #{user}:#{user} /etc/monit/monit.d/"

    unicorn = <<-EOF
check process unicorn
  with pidfile /var/www/unicorn/shared/pids/unicorn.pid
  start program = "/etc/init.d/unicorn start"
  stop program = "/etc/init.d/unicorn stop"
  if cpu is greater than 50% for 2 cycles then alert                  # send an email to admin
  if cpu is greater than 80% for 3 cycles then restart                # hung process?

  group unicorn
    EOF
    put unicorn, "/etc/monit/monit.d/monit-unicorn.conf"

    sudo "service monit restart"
  end

  task :nginx do
    puts "\n\n=== Setup Nginx ===\n\n"
    sudo "cp #{current_path}/config/deploy/nginx/*conf /etc/nginx/"
    sudo "/etc/init.d/nginx restart"
  end

  task :unicorn do
    puts "\n\n=== Update Unicorn script ===\n\n"
    sudo "cp #{release_path}/config/deploy/init.d/unicorn /etc/init.d/unicorn"
    sudo "chmod a+x /etc/init.d/unicorn"
  end

  task :postgresql, :roles => :db do
    puts "\n\n=== Setup postgresql ===\nCorrent conf limit connections to localhost\n\n"
    sudo "su postgres -c \"psql -d template1 -U postgres -c \\\"CREATE USER #{pg_user} WITH PASSWORD '#{pg_password}'\\\"\""
    sudo "su postgres -c \"psql -d template1 -U postgres -c \\\"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO #{pg_user};\\\"\""
    sudo "su postgres -c \"psql -d template1 -U postgres -c \\\"ALTER USER #{pg_user} CREATEDB;\\\"\""
    sudo "su postgres -c \"psql -d template1 -U postgres -c \\\"CREATE DATABASE #{db_name} OWNER #{pg_user};\\\"\""
  end

  task :sidekiq do
    puts "\n\n=== Update Sidekiq script ===\n\n"
    sudo "cp /var/www/unicorn/current/config/deploy/init.d/sidekiq /etc/init.d/sidekiq"
    sudo "chmod a+x /etc/init.d/sidekiq"
  end

  task :nginx do
    puts "\n\n=== Update Nginx script ===\n\n"
    sudo "cp /var/www/unicorn/current/config/deploy/nginx/* /etc/nginx"
    sudo "/etc/init.d/nginx restart"
  end

end
