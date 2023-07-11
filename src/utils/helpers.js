exports.randomInRange = (min, max) => {
  return (Math.random() * (max - min)) + min
}

exports.testCommand = () => {
  console.log('command run')
}