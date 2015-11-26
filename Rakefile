require 'nokogiri'
require 'fileutils'
require 'active_support/core_ext/object/blank'
require 'naturalsorter'

=begin

STAGE
A clean, minimal CSS stylesheet for Markdown, Pandoc and MultiMarkdown HTML output.
https://gist.github.com/ryangray/1882525

=end

class FilesOrganizer
  @@new_root = 'extracted'

  SECTIONS   = %w{introduction basic advanced turbo outro}
  SECTION_TITLES = [
    'Подготовка',
    'Базовый блок',
    'Продвинутый блок',
    'Турбо блок',
    'Заключение'
  ]

  DIRECTORY_MAP = {
    /^(intro|reasons|organizing|aims)$/ => 0,
    /^d((?:[1-9])|(?:[1-4][0-9]))$/     => 1,
    /^d((?:[5-8][0-9])|(?:[9][0-1]))$/  => 2,
    /^d([9][2-8])$/                     => 3,
    /^d(99|100)$/                       => 4
  }

  RENAME = {
    'start'   => 'intro',
    'organiz' => 'organizing'
  }

  def self.rename_filename(old_filename)
    old_base_name = File.basename(old_filename, '.html').downcase
    new_base_name = RENAME[old_base_name]

    if new_base_name
      puts "Renaming #{old_base_name} -> #{new_base_name}"
      old_filename.sub(%r{#{old_base_name}(?=\.html$)}i, new_base_name)
    else
      old_filename
    end
  end

  def self.new_file_path(old_file_path)
    normalized = rename_filename(old_file_path)
    old_basename   = File.basename(normalized, '.html')
    new_file_path = nil

    DIRECTORY_MAP.each do |regexp, chapter_id|
      if old_basename =~ regexp
        new_basename = $1

        # 1 -> 001
        if new_basename =~ /^\d*$/
          new_basename = "%03d" % new_basename.to_i
        end

        chapter_dir  = build_section_dir_name(chapter_id)
        new_file_path = "#{@@new_root}/#{chapter_dir}/#{new_basename}.html"
        break
      end
    end

    if new_file_path
      puts "New path: #{new_file_path}"
      new_file_path
    else
      warn "Can't build new file path for #{old_file_path}"
    end
  end

  def self.build_section_dir_name(chapter_id)
    "%d-%s" % [chapter_id + 1, SECTIONS[chapter_id]]
  end
end

desc "Extract and organize articles from original HTML"

task :extract do

  sources    = Dir["src/**/*.html"]
  target_dir = 'extracted'

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

  puts "Cleaning old target dir: #{target_dir} "
  FileUtils.rm_rf(target_dir)

  STATIC_HEADERS = {
    'reasons' => '5 причин пройти 100-дневный воркаут',
    'aims'    => 'Цели 100-дневного воркаута',
    'organiz' => 'Организационные моменты',
    'START'   => 'О программе'
  }

  sources.each do |src_filename|
    new_filename = FilesOrganizer.new_file_path(src_filename)

    # If we can't build new filename, just skip file
    next unless new_filename

    puts "Extracting content from file: #{src_filename} ..."

    raw_html          = File.read(src_filename)
    extracted_content = extract_article(raw_html)

    unless extracted_content
      puts 'SKIPPED'; next
    end

    header = extract_header(raw_html) || STATIC_HEADERS[File.basename(src_filename, '.html')]

    if header
      puts "Header: \"#{header}\""
      extracted_content = ('<h1>%s</h1>' % header) << extracted_content.to_html
    else
      warn "No header for #{src_filename} found"
    end

    new_dir_name  = File.dirname(new_filename)

    unless Dir.exists?(new_dir_name)
      FileUtils.mkdir_p(new_dir_name)
    end

    File.write(new_filename, extracted_content)
  end
end


desc 'convert to MD'
task :convert do
  sources    = Dir["extracted/**/*.html"]
  target_dir = 'markdown'

  puts "Cleaning old target dir: #{target_dir} "
  FileUtils.rm_rf(target_dir)

  i = 0
  sources.each do |source_file|
    target_filename = source_file.sub(%r{^extracted}, target_dir).sub(%r{\.html$}, '.md')
    target_dir_name  = File.dirname(target_filename)

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
      # Replace **\[1\]** -> 1.
      's:\*\*\\\\\[(\d+)\\\\\]\*\*:\1.:g',
      # Replace \[4\] -> 4. (keep separate)
      's:\\\\\[(\d+)\\\\\]:\1.:g',
      # Replace **1)** -> 1.
      's:\*\*(\d+)\\)\*\*:\1.:g',
      # Replace **2.** -> 1.
      's:\*\*(\d+)(\.?)\*\*:\1.:g',
      # Replace 1.  \* -> 1.
      's:^(\d+)\. *\\\\\*:\1.:g',
      # Shift header level by one
      's:^(#+):\1#:g'
    ]

    # NOTE ; inside code string added
    cmd  += " | perl -p -e '#{seds.join('; ')}'"
    # Remove several empty lines in a row
    cmd  += " | cat -s"
    cmd  += ' > %s' % [target_filename]

    puts cmd
    system cmd

    i += 1
    # Devmode
    # break if i == 1
  end

  # Placing section title files

  FilesOrganizer::SECTIONS.each_with_index do |_, chapter_id|
    section_dir = FilesOrganizer.build_section_dir_name(chapter_id)
    filename = '%s/%s/_section.md' % [target_dir, section_dir]
    section_title = FilesOrganizer::SECTION_TITLES[chapter_id]
    content = "# %s\n" % section_title
    File.write(filename, content)
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
