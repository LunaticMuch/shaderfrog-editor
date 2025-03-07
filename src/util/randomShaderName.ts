const randomArr = <T extends unknown>(arr: Array<T>): T =>
  arr[Math.floor(Math.random() * arr.length)];
const words1 = [
  'Screaming',
  'Happy',
  'Ecstatic',
  'Decisive',
  'Global',
  'Spectacular',
  'Tiny',
  'Bitter',
  'Overconfident',
  'Sneaky',
  'Jumbled',
  'Supreme',
  'Infamous',
  'Visible',
  'Lucky',
  'Bright',
  'Abundant',
  'Melodic',
  'Flagrant',
  'Faulty',
  'Tedious',
  'Divergent',
  'Youthful',
  'Drunken',
  'Remarkable',
  'Imaginary',
  'Friendly',
  'Giant',
  'Temporary',
  'Functional',
  'Cheerful',
  'Educated',
  'Stimulating',
  'Federal',
  'Smiling',
  'Dusty',
  'Parallel',
  'Agreeable',
  'Sparkling',
  'Overt',
  'Glamorous',
  'Flawless',
  'Stupendous',
  'Spiritual',
  'Grunky',
  'Flonky',
  'Smorky',
  'Brombus',
  'Exclusive',
  'Terrific',
  'Significant',
  'Common',
  'Fortunate',
];
const words2 = [
  'Frog',
  'Gecko',
  'Hippo',
  'Gopher',
  'Kangaroo',
  'Deer',
  'Newt',
  'Hamster',
  'Turtle',
  'Otter',
  'Mouse',
  'Camel',
  'Marmoset',
  'Monkey',
  'Ferret',
  'Bear',
  'Cheetah',
  'Dingo',
  'Elephant',
  'Bat',
  'Buffalo',
  'Potato',
  'Virus',
  'Possibility',
  'Poet',
  'Poem',
  'Shader',
  'Dog',
  'Flea',
  'Adventure',
];
const randomShaderName = () => `${randomArr(words1)} ${randomArr(words2)}`;

export default randomShaderName;
