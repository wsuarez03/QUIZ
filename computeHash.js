const bcrypt = require('bcryptjs');
bcrypt.hash('Password123!', 10).then(h => {console.log(h); process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});