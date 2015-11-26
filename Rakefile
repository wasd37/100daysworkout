require 'nokogiri'
require 'fileutils'
require 'active_support/core_ext/object/blank'
require 'naturalsorter'

=begin

STAGE
A clean, minimal CSS stylesheet for Markdown, Pandoc and MultiMarkdown HTML output.
https://gist.github.com/ryangray/1882525

=end

desc "Extract and organize articles from original HTML"

task :extract do

  sources    = Dir["src/**/*.html"]
  output_dir = 'extracted'

  # Nil or section Nokogiri::XML::Element
  def extract_article(raw_html)
    doc = Nokogiri::HTML(raw_html)

    doc.css("div.wrapper > section").first.tap do |section|
      if section
        section.css('footer').remove
        section.css('p #lnkNextDay').remove
      end
    end
  end

  # Nil or stripped header
  def extract_header(raw_html)
    doc    = Nokogiri::HTML(raw_html)
    header = doc.css('.dayname').first

    if header
      stripped = header.text.strip
      stripped.blank? ? nil : stripped
    end
  end

  puts "Cleaning old output dir: #{output_dir} "
  FileUtils.rm_f(output_dir)

  STATIC_HEADERS = {
    'reasons' => '5 причин пройти 100-дневный воркаут',
    'aims'    => 'Цели 100-дневного воркаута',
    'organiz' => 'Организационные моменты',
    'START'   => 'О программе'
  }

  sources.each do |file_name|
    puts "Extracting content from file: #{file_name} ..."

    raw_html          = File.read(file_name)
    extracted_content = extract_article(raw_html)

    unless extracted_content
      puts 'SKIPPED'; next
    end

    header = extract_header(raw_html) || STATIC_HEADERS[File.basename(file_name, '.html')]

    if header
      puts "Header: \"#{header}\""
      extracted_content = ('<h1>%s</h1>' % [header]) << extracted_content.to_html
    else
      warn "No header for #{file_name} found"
    end

    new_file_name = file_name.sub(%r{^src}, output_dir)
    new_dir_name  = File.dirname(new_file_name)

    unless Dir.exists?(new_dir_name)
      FileUtils.mkdir_p(new_dir_name)
    end

    File.write(new_file_name, extracted_content)
  end
end


desc 'convert to MD'
task :convert do
  sources    = Dir["extracted/**/*.html"]
  target_dir = 'markdown'

  i = 0
  sources.each do |source_file|
    target_file_name = source_file.sub(%r{^extracted}, target_dir).sub(%r{\.html$}, '.md')
    target_dir_name  = File.dirname(target_file_name)

    unless Dir.exists?(target_dir_name)
      FileUtils.mkdir_p(target_dir_name)
    end

    # Pandoc extensions:
    # - header_attributes: Цель №2. Повысить уровень физической подготовки {#цель-2.-повысить-уровень-физической-подготовки}
    # - raw_html - disable HTML at all

    options = %w{
      +blank_before_header
      +blank_before_blockquote
      -raw_html
    }

    # -  --no-highlight - Disables syntax highlighting for code blocks and inlines, even when a language attribute is given.
    # Regex lookaround: http://www.regular-expressions.info/lookaround.html
    cmd     = 'pandoc -f html -t markdown_strict%s --no-wrap --no-highlight --atx-headers --normalize %s'
    cmd     = cmd % [options.join, source_file]

    seds = [
      # Remove first single space in a line
      's:^ ?+(?! )::',
      # Remove strange double spaces in a line
      's:(^  \n):\n:',
      # Replace "\*" (listas escaped) with simple markdown "-"
      's:^ ?\\\[*]:-:',
      # Replace images path (TODO: update)
      's:(\.\./)?(img/[^.]+\.jpg):\1../src/\2:',
    ]

    # NOTE ; inside code string added
    cmd  += " | perl -p -e '#{seds.join('; ')}'"
    # Remove several empty lines in a row
    cmd  += " | cat -s"
    cmd  += ' > %s' % [target_file_name]

    puts cmd
    system cmd

    i += 1
    # Devmode
    # break if i == 10
  end
end

# @WIP

desc 'Build EPUB'
task :build_epub do
  # puts `pandoc --version`

  files = Naturalsorter::Sorter.sort(Dir["contents/*.html"])
  files += Naturalsorter::Sorter.sort(Dir["contents/days/*.html"])
  files << 'metadata.yml'

  #
  # cmd = 'pandoc --standalone -o test.epub'

  # -s, --standalone
  # Produce  output  with an appropriate header and footer (e.g.  a standalone HTML, LaTeX, or RTF file, not a fragment).  This option is set automatically for pdf, epub, epub3, fb2, docx, and odt out-
  cmd = 'pandoc -f html -t markdown ' + files.join(" ")
  cmd += ' | '
  cmd += 'pandoc --standalone -f markdown -o test.epub'

  exec cmd

  puts files
end
