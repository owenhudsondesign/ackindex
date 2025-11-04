import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkStorage() {
  console.log('Checking Supabase Storage for PDF files...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // List all files in the pdfs bucket
    const { data: files, error } = await supabase.storage
      .from('pdfs')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing files:', error);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.log('No files found in pdfs bucket.');
      process.exit(0);
    }

    console.log(`Found ${files.length} file(s) in pdfs bucket:\n`);

    for (const file of files) {
      console.log(`📄 ${file.name}`);
      if (file.metadata?.size) {
        console.log(`   Size: ${(file.metadata.size / 1024 / 1024).toFixed(2)} MB`);
      }
      console.log(`   Created: ${file.created_at}`);
      console.log(`   Path: ${file.name}`);
      console.log('');
    }

    // Also list subdirectories (user folders)
    const { data: folders, error: folderError } = await supabase.storage
      .from('pdfs')
      .list();

    if (folderError) {
      console.error('Error listing folders:', folderError);
    } else if (folders && folders.length > 0) {
      console.log('\n📁 Checking user folders...\n');

      for (const folder of folders) {
        if (folder.id) {
          const { data: userFiles } = await supabase.storage
            .from('pdfs')
            .list(folder.name, {
              limit: 100,
              sortBy: { column: 'created_at', order: 'desc' },
            });

          if (userFiles && userFiles.length > 0) {
            console.log(`\n📁 Folder: ${folder.name}`);
            for (const file of userFiles) {
              console.log(`   📄 ${file.name}`);
              if (file.metadata?.size) {
                console.log(`      Size: ${(file.metadata.size / 1024 / 1024).toFixed(2)} MB`);
              }
              console.log(`      Path: ${folder.name}/${file.name}`);
            }
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStorage().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
