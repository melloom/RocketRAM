const { sign } = require('electron-builder');
const fs = require('fs');
const path = require('path');

exports.default = async function(configuration) {
  const { path: filePath, identity } = configuration;
  
  // Check if certificate file exists
  const certFile = process.env.WIN_CERTIFICATE_FILE;
  const certPassword = process.env.WIN_CERTIFICATE_PASSWORD;
  
  if (!certFile || !fs.existsSync(certFile)) {
    console.warn('⚠️  Code signing certificate not found. Building without signature.');
    console.warn('   To enable signing, set WIN_CERTIFICATE_FILE environment variable.');
    return;
  }
  
  if (!certPassword) {
    console.warn('⚠️  Code signing certificate password not set. Building without signature.');
    console.warn('   To enable signing, set WIN_CERTIFICATE_PASSWORD environment variable.');
    return;
  }
  
  console.log('🔐 Signing executable:', filePath);
  
  try {
    // Use signtool for Windows code signing
    const { exec } = require('child_process');
    const signToolPath = 'signtool.exe'; // Usually in Windows SDK
    const timestampServers = [
      'http://timestamp.digicert.com',
      'http://timestamp.verisign.com/scripts/timstamp.dll',
      'http://timestamp.globalsign.com/tsa/r6advanced1'
    ];
    
    // Try to sign with each timestamp server until one works
    for (const timestampServer of timestampServers) {
      try {
        const command = `"${signToolPath}" sign /f "${certFile}" /p "${certPassword}" /t "${timestampServer}" /v "${filePath}"`;
        
        await new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            console.log(stdout);
            resolve();
          });
        });
        
        console.log('✅ Code signing successful!');
        return;
      } catch (error) {
        console.warn(`Timestamp server ${timestampServer} failed, trying next...`);
        continue;
      }
    }
    
    // If timestamp servers fail, sign without timestamp
    const command = `"${signToolPath}" sign /f "${certFile}" /p "${certPassword}" /v "${filePath}"`;
    
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        console.log(stdout);
        resolve();
      });
    });
    
    console.log('✅ Code signing successful (without timestamp)!');
  } catch (error) {
    console.error('❌ Code signing failed:', error.message);
    throw error;
  }
};


