Pod::Spec.new do |s|
  s.name = 'PlasmaAR'
  s.version = '0.2.0'
  s.summary = 'ARKit session view and capability probe for Plasma Pro'
  s.description = 'Runs ARWorldTracking for guided wound photos and saves frame metadata. Not a validated measurement.'
  s.license = { :type => 'MIT' }
  s.author = 'Plasma Pro'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ARKit', 'AVFoundation', 'SceneKit', 'CoreImage'
  s.source_files = '**/*.{h,m,mm,swift}'
end
