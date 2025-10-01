/**
 * `tasks/register/polyfill.js`
 *
 * ---------------------------------------------------------------
 *
 * For more information see:
 *   https://sailsjs.com/anatomy/tasks/register/polyfill.js
 *
 */
module.exports = function(grunt) {
  grunt.registerTask('polyfill:prod', 'Add the polyfill file to the top of the list of files to concatenate', ()=>{
// Use our custom lightweight regenerator polyfill for dev too
    grunt.config.set('copy.dev.files', grunt.config.get('copy.dev.files').concat({
      expand: true,
      cwd: 'assets/js',
      src: 'regenerator-polyfill.js',
      dest: '.tmp/public/js'
    }));
    var devLinkFiles = grunt.config.get('sails-linker.devJs.files');
    grunt.config.set('sails-linker.devJs.files', Object.keys(devLinkFiles).reduce((linkerConfigSoFar, glob)=>{
      linkerConfigSoFar[glob] = ['.tmp/public/js/regenerator-polyfill.js'].concat(devLinkFiles[glob]);
      return linkerConfigSoFar;
    }, {}));
  });
  grunt.registerTask('polyfill:dev', 'Add the polyfill file to the top of the list of files to copy and link', ()=>{
    // Use our custom lightweight regenerator polyfill for dev too
    grunt.config.set('copy.dev.files', grunt.config.get('copy.dev.files').concat({
      expand: true,
      cwd: 'assets/js',
      src: 'regenerator-polyfill.js',
      dest: '.tmp/public/js'
    }));
    var devLinkFiles = grunt.config.get('sails-linker.devJs.files');
    grunt.config.set('sails-linker.devJs.files', Object.keys(devLinkFiles).reduce((linkerConfigSoFar, glob)=>{
      linkerConfigSoFar[glob] = ['.tmp/public/js/regenerator-polyfill.js'].concat(devLinkFiles[glob]);
      return linkerConfigSoFar;
    }, {}));
  });
};

