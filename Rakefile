require 'nokogiri'
require 'fileutils'

desc "Extract articles from original HTML"

task :extract do
  sources    = Dir["*.html", "days/**/*.html"]
  output_dir = 'contents'

  def extract_article(raw_html)
    doc = Nokogiri::HTML(raw_html)

    doc.css("div.wrapper > section").first.tap do |section|
      if section
        section.css('footer').remove
        section.css('p #lnkNextDay').remove
      end

      section
    end
  end

  # Dirty hack

  FileUtils.mkdir_p(output_dir)
  FileUtils.mkdir_p(output_dir + '/days')

  sources.each do |file_name|
    puts "Extracting content from file: #{file_name} ..."

    raw_html          = File.read(file_name)
    extracted_content = extract_article(raw_html)
    output_file       = '%s/%s' % [output_dir, file_name]

    File.write(output_file, extracted_content)
  end
end
