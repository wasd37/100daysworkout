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

  SECTIONS       = %w{introduction basic advanced turbo outro}
  SECTION_TITLES = [
    'Подготовка',
    'Базовый блок',
    'Продвинутый блок',
    'Турбо блок',
    'Заключение'
  ]

  DIRECTORY_MAP = {
    /^(\d\-(?:intro|reasons|organizing|aims))$/ => 0,
    /^d((?:[1-9])|(?:[1-4][0-9]))$/             => 1,
    /^d((?:[5-8][0-9])|(?:[9][0-1]))$/          => 2,
    /^d([9][2-8])$/                             => 3,
    /^d(99|100)$/                               => 4
  }

  RENAME = {
    'start'   => '1-intro',
    'reasons' => '2-reasons',
    'aims'    => '3-aims',
    'organiz' => '4-organizing'
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
    normalized    = rename_filename(old_file_path)
    old_basename  = File.basename(normalized, '.html')
    new_file_path = nil

    DIRECTORY_MAP.each do |regexp, chapter_id|
      if old_basename =~ regexp
        new_basename = $1

        # 1 -> 001
        if new_basename =~ /^\d*$/
          new_basename = "%03d" % new_basename.to_i
        end

        chapter_dir   = build_section_dir_name(chapter_id)
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
        # 404 img
        section.css('#pagePlaceHolder_imgCover').remove
        # Smileys
        section.css('img[src*="workout.su/img/smileys"]').remove
        section.css('a[href="index.html"]').remove

        # BLOCKQUOTES

        # We have one BQ header with : in it
        section.css('.bbcode_quote_head').select do |element|
          element.inner_text.strip.length < 2
        end.each(&:remove)

        # Select BQ body, and move sibled header into it
        section.css('.bbcode_quote_head + .bbcode_quote_body').each do |bq_body|
          header = bq_body.previous_element
          header.remove
          header.name = 'h5'
          bq_body.prepend_child(header)
          bq_body.name = 'blockquote'
        end
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

  # START.html has its own h1 header
  STATIC_HEADERS = {
    'reasons' => '5 причин пройти 100-дневный воркаут',
    'aims'    => 'Цели 100-дневного воркаута',
    'organiz' => 'Организационные моменты'
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

    new_dir_name = File.dirname(new_filename)

    unless Dir.exists?(new_dir_name)
      FileUtils.mkdir_p(new_dir_name)
    end

    File.write(new_filename, extracted_content)
  end
end


desc 'convert to MD'
task :convert do
  sources    = Dir["extracted/**/*.html"]
  # sources    = ['extracted/2-basic/017.html']
  # sources    = ['extracted/3-advanced/050.html']
  # sources    = ['extracted/2-basic/001.html']
  target_dir = 'markdown'

  puts "Cleaning old target dir: #{target_dir} "
  FileUtils.rm_rf(target_dir)

  i = 0
  sources.each do |source_file|
    target_filename = source_file.sub(%r{^extracted}, target_dir).sub(%r{\.html$}, '.md')
    target_dir_name = File.dirname(target_filename)

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

      # \*\*\* Важно \*\*\* -> **ВАЖНО**
      's:(\\\\\*){2,} *([^\*]+?) ?(\\\\\*){2,}:**\2**:g',

      # Replace "\*" (lists escaped) with simple markdown "-"
      's:^ *\\\\\*:-:',

      # Replace "> \*" (quoted lists escaped) with simple markdown "> -"
      's:^> *\\\\\*:> -:',

      # Replace **\[1\]** -> 1.
      's:\*\*\\\\\[(\d+)\\\\\]\*\*:\1.:g',

      # Replace \[4\] -> 4. (keep separate)
      's:\\\\\[(\d+)\\\\\]:\1.:g',

      # Replace **1)** -> 1.
      's:\*\*(\d+)\\)\*\*:\1.:g',

      # Replace **1) -> **1.
      's:(\*\*)(\d+)\\):\1\2.:g',

      # Replace **2.** -> 1.
      's:\*\*(\d+)(\.?)\*\*:\1.:g',

      # Replace 1) -> 1.
      's:^(\d+)\\) *:\1. :g',

      # Replace 1. \* -> 1.
      's:^(\d+\.) *\\\\\*:\1:g',

      # Replace 1. 1. -> 1.
      's:^\d\. +(\d\.):\1 :',

      # Shift header level by one
      's:^(#+):\1#:g',

      # Replace images path
      's:(\.\./)?(img/[^.]+\.jpg):src/\2:',

      # Ensure new line before list begin
      's:^(1\.):\n\1:g',

      # Ensure headers always starts from new line
      's:(#{3,}):\n\1:g',

      # Add day headers ID
      's:^(## День )(\d+)(.+):\1\2\3 \{#d\2\}:g',
      # Links to days
      's:\(d(\d+)\.html\):(#d\1):g',

      # Double spaces
      's: {2,}: :g',
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
    section_dir   = FilesOrganizer.build_section_dir_name(chapter_id)
    filename      = '%s/%s.md' % [target_dir, section_dir]
    section_title = FilesOrganizer::SECTION_TITLES[chapter_id]
    content       = "# %s\n" % section_title
    File.write(filename, content)
  end
end

# @WIP

desc 'Build EPUB'
task :build_epub do

  source = 'markdown'
  # source = 'links'
  files = ['metadata.yml'] + Naturalsorter::Sorter.sort(Dir["#{source}/**/*.md"])

  # NOTE: However, if you use wildcards on the command line, be sure to escape
  # them or put the whole filename in single quotes, to prevent them from being
  # interpreted by the shell.

  args = [
    '--standalone',
    '--toc --toc-depth=2',
    '--epub-stylesheet=assets/book.css',
    '--epub-cover=assets/cover.jpg',
    '--epub-embed-font=assets/\'*.ttf\'',
    # Specify the header level at which to split the EPUB into separate “chapter” files.
    '--epub-chapter-level=2',
    '-o test.epub',
    files.join(' ')
  ]

  cmd = "pandoc #{args.join(' ')}"

  puts cmd
  exec cmd
end


desc "Run all"
task all: [:extract, :convert, :build_epub]

desc "Extract test.epub"
task :extract_epub do
  file = 'test.epub'
  target_dir = 'tmp/epub'

  FileUtils.rm_rf(target_dir)
  FileUtils.mkdir_p(target_dir)

  `unzip #{file} -d #{target_dir}`
end
