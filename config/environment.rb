# Load the Rails application.
require File.expand_path('../application', __FILE__)

# Initialize the Rails application.
Resonate::Application.initialize!

Paperclip.options[:command_path] = "/usr/local/bin/"
