// plugins/devotion.js - KIRA X MD (Gita, Bible, Quran & Epic Quotes)
const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

// ==========================================
// 📜 QUOTES DATABASES
// ==========================================
const GITA_QUOTES = [
    { quote: "You have a right to perform your duty, but not to the fruits of your actions.", speaker: "Krishna", verse: "Bhagavad Gita 2.47" },
    { quote: "The soul is never born, nor does it ever die.", speaker: "Krishna", verse: "Bhagavad Gita 2.20" },
    { quote: "Just as a person changes worn-out clothes for new ones, the soul accepts new bodies.", speaker: "Krishna", verse: "Bhagavad Gita 2.22" },
    { quote: "Weapons cannot cut the soul, fire cannot burn it, water cannot wet it, and wind cannot dry it.", speaker: "Krishna", verse: "Bhagavad Gita 2.23" },
    { quote: "The soul is eternal, all-pervading, immovable and everlasting.", speaker: "Krishna", verse: "Bhagavad Gita 2.24" },
    { quote: "The unreal has no existence, while the real never ceases to exist.", speaker: "Krishna", verse: "Bhagavad Gita 2.16" },
    { quote: "The wise are not disturbed by pleasure and pain.", speaker: "Krishna", verse: "Bhagavad Gita 2.15" },
    { quote: "Perform your duty without attachment to the results.", speaker: "Krishna", verse: "Bhagavad Gita 2.47" },
    { quote: "Yoga is the state of equanimity.", speaker: "Krishna", verse: "Bhagavad Gita 2.48" },
    { quote: "Established in yoga, perform your actions and abandon attachment.", speaker: "Krishna", verse: "Bhagavad Gita 2.48" },
    { quote: "No one can remain even for a moment without performing action.", speaker: "Krishna", verse: "Bhagavad Gita 3.5" },
    { quote: "Action is better than inaction.", speaker: "Krishna", verse: "Bhagavad Gita 3.8" },
    { quote: "Perform your prescribed duty, for action is better than inaction.", speaker: "Krishna", verse: "Bhagavad Gita 3.8" },
    { quote: "The world is bound by action unless action is performed as sacrifice.", speaker: "Krishna", verse: "Bhagavad Gita 3.9" },
    { quote: "Whatever a great person does, others follow.", speaker: "Krishna", verse: "Bhagavad Gita 3.21" },
    { quote: "The wise act without attachment for the welfare of the world.", speaker: "Krishna", verse: "Bhagavad Gita 3.25" },
    { quote: "It is desire, born of passion, that becomes anger.", speaker: "Krishna", verse: "Bhagavad Gita 3.37" },
    { quote: "Desire is the great enemy of wisdom.", speaker: "Krishna", verse: "Bhagavad Gita 3.39" },
    { quote: "Control your senses and conquer desire.", speaker: "Krishna", verse: "Bhagavad Gita 3.41" },
    { quote: "Better to perform your own duty imperfectly than another's duty perfectly.", speaker: "Krishna", verse: "Bhagavad Gita 3.35" },
    { quote: "Whenever righteousness declines and unrighteousness rises, I manifest Myself.", speaker: "Krishna", verse: "Bhagavad Gita 4.7" },
    { quote: "I appear age after age to protect righteousness.", speaker: "Krishna", verse: "Bhagavad Gita 4.8" },
    { quote: "To protect the good, destroy evil and establish righteousness, I manifest Myself.", speaker: "Krishna", verse: "Bhagavad Gita 4.8" },
    { quote: "One who understands My divine birth and actions is not born again.", speaker: "Krishna", verse: "Bhagavad Gita 4.9" },
    { quote: "As people approach Me, so do I respond to them.", speaker: "Krishna", verse: "Bhagavad Gita 4.11" },
    { quote: "The wise see action in inaction and inaction in action.", speaker: "Krishna", verse: "Bhagavad Gita 4.18" },
    { quote: "One who acts without attachment is truly wise.", speaker: "Krishna", verse: "Bhagavad Gita 4.19" },
    { quote: "There is nothing in this world as purifying as knowledge.", speaker: "Krishna", verse: "Bhagavad Gita 4.38" },
    { quote: "Approach a wise teacher with humility, inquiry and service.", speaker: "Krishna", verse: "Bhagavad Gita 4.34" },
    { quote: "Knowledge destroys the darkness of ignorance.", speaker: "Krishna", verse: "Bhagavad Gita 4.35" },
    { quote: "One who has conquered the mind has a friend in the mind.", speaker: "Krishna", verse: "Bhagavad Gita 6.6" },
    { quote: "For one who has conquered the mind, the mind is the best of friends.", speaker: "Krishna", verse: "Bhagavad Gita 6.6" },
    { quote: "The mind alone can be the friend of the self, and the mind alone can be its enemy.", speaker: "Krishna", verse: "Bhagavad Gita 6.5" },
    { quote: "Lift yourself by yourself; do not degrade yourself.", speaker: "Krishna", verse: "Bhagavad Gita 6.5" },
    { quote: "The mind is restless and difficult to control, but it can be restrained by practice and detachment.", speaker: "Krishna", verse: "Bhagavad Gita 6.35" },
    { quote: "One who sees Me everywhere and sees everything in Me is never separated from Me.", speaker: "Krishna", verse: "Bhagavad Gita 6.30" },
    { quote: "The yogi sees the Self in all beings and all beings in the Self.", speaker: "Krishna", verse: "Bhagavad Gita 6.29" },
    { quote: "The supreme yogi sees the happiness and suffering of others as his own.", speaker: "Krishna", verse: "Bhagavad Gita 6.32" },
    { quote: "With practice and detachment, the mind can be brought under control.", speaker: "Krishna", verse: "Bhagavad Gita 6.35" },
    { quote: "Peace comes to the person whose mind is controlled.", speaker: "Krishna", verse: "Bhagavad Gita 6.7" },
    { quote: "I am the taste in water.", speaker: "Krishna", verse: "Bhagavad Gita 7.8" },
    { quote: "I am the light of the sun and the moon.", speaker: "Krishna", verse: "Bhagavad Gita 7.8" },
    { quote: "I am the sacred syllable Om in all the Vedas.", speaker: "Krishna", verse: "Bhagavad Gita 7.8" },
    { quote: "I am the sound in space and the ability in human beings.", speaker: "Krishna", verse: "Bhagavad Gita 7.8" },
    { quote: "I am the fragrance of the earth and the brilliance of fire.", speaker: "Krishna", verse: "Bhagavad Gita 7.9" },
    { quote: "I am the life in all living beings.", speaker: "Krishna", verse: "Bhagavad Gita 7.9" },
    { quote: "I am the eternal seed of all beings.", speaker: "Krishna", verse: "Bhagavad Gita 7.10" },
    { quote: "I am strength free from desire and attachment.", speaker: "Krishna", verse: "Bhagavad Gita 7.11" },
    { quote: "Those who surrender to Me cross beyond My divine illusion.", speaker: "Krishna", verse: "Bhagavad Gita 7.14" },
    { quote: "Those who take refuge in Me attain knowledge of the Supreme.", speaker: "Krishna", verse: "Bhagavad Gita 7.29" },
    { quote: "Remember Me and perform your duty.", speaker: "Krishna", verse: "Bhagavad Gita 8.7" },
    { quote: "Fix your mind on Me and remember Me at all times.", speaker: "Krishna", verse: "Bhagavad Gita 8.7" },
    { quote: "One who remembers Me at the time of death comes to Me.", speaker: "Krishna", verse: "Bhagavad Gita 8.5" },
    { quote: "Whatever state of being one remembers at death, that state one attains.", speaker: "Krishna", verse: "Bhagavad Gita 8.6" },
    { quote: "The Supreme is eternal and beyond destruction.", speaker: "Krishna", verse: "Bhagavad Gita 8.3" },
    { quote: "Devotion makes Me easily attainable.", speaker: "Krishna", verse: "Bhagavad Gita 8.14" },
    { quote: "One who constantly remembers Me with an undivided mind reaches Me.", speaker: "Krishna", verse: "Bhagavad Gita 8.14" },
    { quote: "The yogi who knows Me as the Supreme Lord attains Me.", speaker: "Krishna", verse: "Bhagavad Gita 8.22" },
    { quote: "Those who know Me as the Supreme Being know the eternal truth.", speaker: "Krishna", verse: "Bhagavad Gita 8.3" },
    { quote: "The path of devotion leads the seeker toward the Supreme.", speaker: "Krishna", verse: "Bhagavad Gita 8.22" },
    { quote: "Whatever you do, whatever you eat, whatever you offer, do it as an offering to Me.", speaker: "Krishna", verse: "Bhagavad Gita 9.27" },
    { quote: "Whoever offers Me a leaf, a flower, a fruit or water with devotion, I accept it.", speaker: "Krishna", verse: "Bhagavad Gita 9.26" },
    { quote: "I am equally disposed toward all beings.", speaker: "Krishna", verse: "Bhagavad Gita 9.29" },
    { quote: "My devotee never perishes.", speaker: "Krishna", verse: "Bhagavad Gita 9.31" },
    { quote: "Even a person of very sinful conduct, if devoted to Me, should be regarded as righteous.", speaker: "Krishna", verse: "Bhagavad Gita 9.30" },
    { quote: "Those who worship Me with devotion live in Me, and I live in them.", speaker: "Krishna", verse: "Bhagavad Gita 9.29" },
    { quote: "Think of Me, become My devotee, worship Me and bow to Me.", speaker: "Krishna", verse: "Bhagavad Gita 9.34" },
    { quote: "I am the same toward friend and enemy.", speaker: "Krishna", verse: "Bhagavad Gita 9.29" },
    { quote: "Whatever you do, make it an offering to Me.", speaker: "Krishna", verse: "Bhagavad Gita 9.27" },
    { quote: "Those who are devoted to Me attain the highest goal.", speaker: "Krishna", verse: "Bhagavad Gita 9.34" },
    { quote: "I am the source of everything; from Me everything proceeds.", speaker: "Krishna", verse: "Bhagavad Gita 10.8" },
    { quote: "I am the Self seated in the hearts of all beings.", speaker: "Krishna", verse: "Bhagavad Gita 10.20" },
    { quote: "I am the beginning, middle and end of all beings.", speaker: "Krishna", verse: "Bhagavad Gita 10.20" },
    { quote: "Among lights, I am the radiant sun.", speaker: "Krishna", verse: "Bhagavad Gita 10.21" },
    { quote: "Among rivers, I am the Ganges.", speaker: "Krishna", verse: "Bhagavad Gita 10.31" },
    { quote: "Among seasons, I am spring.", speaker: "Krishna", verse: "Bhagavad Gita 10.35" },
    { quote: "I am time, the mighty destroyer of worlds.", speaker: "Krishna", verse: "Bhagavad Gita 11.32" },
    { quote: "All beings arise from Me.", speaker: "Krishna", verse: "Bhagavad Gita 10.8" },
    { quote: "I am the wisdom of the wise.", speaker: "Krishna", verse: "Bhagavad Gita 7.10" },
    { quote: "I am the silence of secrets and the wisdom of the wise.", speaker: "Krishna", verse: "Bhagavad Gita 10.38" },
    { quote: "One who is free from hatred toward all beings is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.13" },
    { quote: "One who is friendly and compassionate toward all beings is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.13" },
    { quote: "One who is free from ego and possesses equanimity is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.13" },
    { quote: "One who neither disturbs the world nor is disturbed by it is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.15" },
    { quote: "One who is alike in honor and dishonor is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.18" },
    { quote: "Fix your mind on Me and become devoted to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.8" },
    { quote: "One who is content, self-controlled and devoted to Me is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.14" },
    { quote: "One who has no hatred, fear or anxiety is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.15" },
    { quote: "One who is satisfied with whatever comes and remains steady is dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.19" },
    { quote: "Those who follow this immortal path of devotion are exceedingly dear to Me.", speaker: "Krishna", verse: "Bhagavad Gita 12.20" },
    { quote: "Humility, nonviolence, patience and purity are qualities of true knowledge.", speaker: "Krishna", verse: "Bhagavad Gita 13.8" },
    { quote: "The Supreme Self is present equally in all beings.", speaker: "Krishna", verse: "Bhagavad Gita 13.27" },
    { quote: "One who sees the same Supreme everywhere truly sees.", speaker: "Krishna", verse: "Bhagavad Gita 13.28" },
    { quote: "The body is the field, and the one who knows it is called the knower of the field.", speaker: "Krishna", verse: "Bhagavad Gita 13.1-2" },
    { quote: "The Supreme Self does not perish when the body perishes.", speaker: "Krishna", verse: "Bhagavad Gita 13.31" },
    { quote: "The three qualities of nature bind the embodied being.", speaker: "Krishna", verse: "Bhagavad Gita 14.5" },
    { quote: "From goodness arises knowledge.", speaker: "Krishna", verse: "Bhagavad Gita 14.17" },
    { quote: "From passion arises greed.", speaker: "Krishna", verse: "Bhagavad Gita 14.17" },
    { quote: "From darkness arise ignorance, negligence and delusion.", speaker: "Krishna", verse: "Bhagavad Gita 14.17" },
    { quote: "The one who rises beyond the three qualities becomes fit for immortality.", speaker: "Krishna", verse: "Bhagavad Gita 14.20" },
    { quote: "There are three gates leading to self-destruction: desire, anger and greed.", speaker: "Krishna", verse: "Bhagavad Gita 16.21" },
    { quote: "Abandon desire, anger and greed; they are the gates to darkness.", speaker: "Krishna", verse: "Bhagavad Gita 16.21" },
    { quote: "Fearlessness, purity of heart and self-control are divine qualities.", speaker: "Krishna", verse: "Bhagavad Gita 16.1" },
    { quote: "Humility, straightforwardness and compassion are divine qualities.", speaker: "Krishna", verse: "Bhagavad Gita 16.1-3" },
    { quote: "One who abandons ego, desire and anger moves toward freedom.", speaker: "Krishna", verse: "Bhagavad Gita 16.1-3" },
    { quote: "Faith is according to one's nature.", speaker: "Krishna", verse: "Bhagavad Gita 17.3" },
    { quote: "A person is made of the faith that he possesses.", speaker: "Krishna", verse: "Bhagavad Gita 17.3" },
    { quote: "The food that promotes life, health and strength is dear to those in goodness.", speaker: "Krishna", verse: "Bhagavad Gita 17.8" },
    { quote: "Charity given without expectation of return is considered pure.", speaker: "Krishna", verse: "Bhagavad Gita 17.20" },
    { quote: "Action performed without attachment and without desire for reward is pure.", speaker: "Krishna", verse: "Bhagavad Gita 18.23" },
    { quote: "Better to perform one's own duty, even imperfectly, than another's duty well.", speaker: "Krishna", verse: "Bhagavad Gita 18.47" },
    { quote: "By devotion, one truly knows Me and enters into Me.", speaker: "Krishna", verse: "Bhagavad Gita 18.55" },
    { quote: "Abandoning attachment, perform your duty.", speaker: "Krishna", verse: "Bhagavad Gita 18.9" },
    { quote: "One who is free from ego, desire and possessiveness attains peace.", speaker: "Krishna", verse: "Bhagavad Gita 18.53" },
    { quote: "Surrender all duties to Me and take refuge in Me alone.", speaker: "Krishna", verse: "Bhagavad Gita 18.66" },
    { quote: "Do not fear; I shall free you from all sinful reactions.", speaker: "Krishna", verse: "Bhagavad Gita 18.66" },
    { quote: "Arjuna said: My delusion is destroyed and I have regained my memory.", speaker: "Arjuna", verse: "Bhagavad Gita 18.73" },
    { quote: "I shall act according to Your word.", speaker: "Arjuna", verse: "Bhagavad Gita 18.73" },
    { quote: "Sanjaya said: Wherever there is Krishna, the Lord of Yoga, and Arjuna, there will be victory.", speaker: "Sanjaya", verse: "Bhagavad Gita 18.78" },
    { quote: "Dhritarashtra said: What did my sons and the sons of Pandu do after assembling at Kurukshetra?", speaker: "Dhritarashtra", verse: "Bhagavad Gita 1.1" }
];

const RAMAYANA_QUOTES = [
    "Dharma is the path that remains right even when it is difficult.",
    "A promise is sacred when it is kept even at the cost of comfort.",
    "Lord Rama showed that righteousness is greater than power.",
    "True strength is remaining calm when anger would be easier.",
    "Courage is walking toward duty even when the road is uncertain.",
    "A noble heart chooses dharma over personal desire.",
    "Rama's life teaches that truth may be difficult, but it never loses its value.",
    "Respect for parents is one of the highest forms of gratitude.",
    "A person's character is revealed by how they act when no one is watching.",
    "Greatness is measured by sacrifice, not possessions.",
    "Hanuman teaches us that devotion can transform impossible tasks into possible ones.",
    "Where there is sincere devotion, fear becomes smaller.",
    "Strength becomes meaningful only when it is used for the protection of others.",
    "Hanuman's greatest power was not his strength, but his devotion to Rama.",
    "Service performed without selfishness becomes a form of worship.",
    "Loyalty is standing beside someone even when the journey becomes difficult.",
    "Lakshmana teaches that true brotherhood is built through sacrifice.",
    "A brother's love can become a shield against the hardships of life.",
    "Bharata showed that love does not always demand possession.",
    "True devotion respects the wishes of the one it loves.",
    "Bharata chose responsibility over a throne.",
    "A kingdom is meaningless without righteousness.",
    "A ruler must serve the people before serving himself.",
    "Leadership begins with self-discipline.",
    "Power without dharma eventually destroys its own foundation.",
    "Ravana possessed immense knowledge, but pride weakened his wisdom.",
    "Knowledge without humility can become a source of downfall.",
    "Ego can turn great achievements into great failures.",
    "The greatest enemy may live within one's own mind.",
    "Anger can destroy in moments what took years to build.",
    "Desire without discipline can lead a person away from dharma.",
    "Victory over oneself is greater than victory over an enemy.",
    "A disciplined mind is stronger than a powerful weapon.",
    "Truth does not need deception to defend itself.",
    "Dharma may be tested many times, but it should not be abandoned.",
    "Doing the right thing is not always the easiest thing.",
    "The righteous path may be lonely, but it leads to inner peace.",
    "A person's duty should not be abandoned because of temporary suffering.",
    "Hardship can reveal the strength hidden within a person.",
    "Forest paths can teach lessons that royal palaces cannot.",
    "Every difficult journey carries a lesson.",
    "Patience is strength waiting for the right moment.",
    "Faith gives courage when circumstances give fear.",
    "Hope remains alive when the heart refuses to surrender.",
    "Even across an ocean, determination can find a path.",
    "Hanuman's leap teaches that faith can overcome seemingly impossible distances.",
    "When purpose is pure, courage becomes powerful.",
    "A sincere mission gives strength to the person who carries it.",
    "Never underestimate what devotion and determination can accomplish.",
    "True friendship stands firm during difficult times.",
    "Sugriva learned that loyal allies can change the course of destiny.",
    "A friend should be valued not only during happiness but also during struggle.",
    "Friendship becomes sacred when it is based on trust and responsibility.",
    "Promises between true friends should be protected like sacred vows.",
    "Forgiveness is powerful, but wisdom must accompany it.",
    "Mercy is a strength when guided by dharma.",
    "Compassion does not make a person weak; it makes their strength meaningful.",
    "A noble person protects even when revenge would be easier.",
    "The dignity of a person is preserved through righteous conduct.",
    "Sita represents strength that does not always need to be loud.",
    "Inner strength can survive even the harshest circumstances.",
    "Courage can exist alongside fear.",
    "Faith can keep the heart steady during separation and suffering.",
    "A pure heart can remain strong even when surrounded by darkness.",
    "True devotion does not disappear when circumstances become difficult.",
    "Love rooted in respect is stronger than love rooted in possession.",
    "Sacrifice becomes meaningful when it protects what is righteous.",
    "Dharma is not determined by convenience.",
    "A person's values are tested most when they have something to lose.",
    "The greatest battles are often battles between duty and desire.",
    "A clear conscience is greater than worldly comfort.",
    "The path of truth may demand sacrifice, but it protects one's honor.",
    "Honor is built through countless small acts of righteousness.",
    "A promise made with sincerity should be carried with courage.",
    "The wise person controls the mind before trying to control the world.",
    "Humility protects wisdom from becoming arrogance.",
    "Pride closes the ears before wisdom can enter.",
    "The fall of the mighty often begins with unchecked ego.",
    "A person's downfall can begin when they believe themselves beyond consequence.",
    "No amount of power can permanently protect an unrighteous action.",
    "Every action carries consequences.",
    "Dharma ultimately gives direction when life becomes confusing.",
    "When the mind is uncertain, return to your principles.",
    "A righteous purpose gives meaning to sacrifice.",
    "Courage is not the absence of fear; it is choosing duty despite fear.",
    "Faith and action must walk together.",
    "Prayer can strengthen the heart, but effort must complete the journey.",
    "Do not wait for miracles when you have the strength to act.",
    "Hanuman acted with faith, courage, humility, and purpose.",
    "The bridge to Lanka began with determination before it was built with stones.",
    "Great achievements begin with a decision to begin.",
    "Even the smallest contribution becomes valuable when made for a noble purpose.",
    "Everyone has a role in a righteous mission.",
    "A true leader recognizes the strength of others.",
    "Respecting those who serve you is a sign of true greatness.",
    "Dharma is greater than victory.",
    "Winning a battle means little if one loses one's principles.",
    "The greatest victory is returning from the battlefield without losing one's humanity.",
    "Let truth guide your words, dharma guide your actions, and compassion guide your heart.",
    "Walk the path of righteousness even when nobody applauds you.",
    "Like Rama, choose dharma; like Hanuman, choose devotion; like Sita, choose inner strength."
];


module.exports = [
    // ==========================================
    // 🕉️ GITA & KRISHNA QUOTES COMMANDS
    // ==========================================
    {
        name: 'gitaquotes',
        alias: ['gitaquote', 'randomgita'],
        category: 'devotion',
        description: 'Get a random quote from the Bhagavad Gita',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🕉️", key: msg.key } });
                
                const randomQuote = GITA_QUOTES[Math.floor(Math.random() * GITA_QUOTES.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `📜 *Bhagavad Gita Quote*\n\n"${randomQuote.quote}"\n\n— _${randomQuote.speaker}_ (${randomQuote.verse})\n\n> _Shared by KIRA X MD_` 
                }, { quoted: msg });
                
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },
    {
        name: 'krishnaquotes',
        alias: ['krishnaquote'],
        category: 'devotion',
        description: 'Get a random Krishna quote',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🦚", key: msg.key } });
                
                // ഫിൽറ്റർ ചെയ്ത് കൃഷ്ണൻ പറഞ്ഞ കോട്ടുകൾ മാത്രം എടുക്കുന്നു
                const krishnaOnlyQuotes = GITA_QUOTES.filter(q => q.speaker === "Krishna");
                const randomQuote = krishnaOnlyQuotes[Math.floor(Math.random() * krishnaOnlyQuotes.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `🦚 *Lord Krishna Says:*\n\n"${randomQuote.quote}"\n\n— _(${randomQuote.verse})_\n\n> _Shared by KIRA X MD_` 
                }, { quoted: msg });
                
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // 🏹 RAMAYANA QUOTES COMMAND
    // ==========================================
    {
        name: 'ramayanaquotes',
        alias: ['ramayanaquote', 'ramquote'],
        category: 'devotion',
        description: 'Get a random quote from the Ramayana',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🏹", key: msg.key } });
                
                const randomQuote = RAMAYANA_QUOTES[Math.floor(Math.random() * RAMAYANA_QUOTES.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `🏹 *Ramayana Quote*\n\n"${randomQuote}"\n\n> _Shared by KIRA X MD_` 
                }, { quoted: msg });
                
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // 📖 GITA CHAPTER & VERSE (API)
    // ==========================================
    {
        name: 'gitachapter',
        alias: ['readgita'],
        category: 'devotion',
        description: 'Read a specific chapter summary from Bhagavad Gita',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";
            const chapterNum = args[0];

            if (!chapterNum || isNaN(chapterNum) || chapterNum < 1 || chapterNum > 18) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}gitachapter 1_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "📖", key: msg.key } });
                const res = await axios.get(`https://vedicscriptures.github.io/chapter/${chapterNum}`, { headers });
                
                if (res.data && res.data.summary) {
                    const title = res.data.translation || res.data.name;
                    const summaryText = res.data.summary.en; 
                    await sock.sendMessage(jid, { 
                        text: `📖 *Bhagavad Gita - Chapter ${chapterNum}*\n*${title}*\n\n${summaryText}\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[GITA CHAPTER ERROR]", err.message);
                await sock.sendMessage(jid, { text: "❌ *Chapter not found or API Error!*" }, { quoted: msg });
            }
        }
    },
    {
        name: 'gitaverse',
        alias: ['gitashlok'],
        category: 'devotion',
        description: 'Read a specific verse from Bhagavad Gita',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";

            if (!args[0] || !args[1] || isNaN(args[0]) || isNaN(args[1])) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}gitaverse 1 1_ (Chapter 1, Verse 1)` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
                const res = await axios.get(`https://vedicscriptures.github.io/slok/${args[0]}/${args[1]}`, { headers });
                
                if (res.data && res.data.slok) {
                    const shlok = res.data.slok;
                    const translation = res.data.siva ? res.data.siva.et : res.data.purohit.et; 
                    
                    await sock.sendMessage(jid, { 
                        text: `📜 *Bhagavad Gita - ${args[0]}:${args[1]}*\n\n${shlok}\n\n*Translation:*\n${translation}\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[GITA VERSE ERROR]", err.message);
                await sock.sendMessage(jid, { text: `❌ *Verse not found. Check Chapter and Verse numbers.*` }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // ☪️ QURAN COMMANDS (API - AlQuran Cloud)
    // ==========================================
    {
        name: 'quranverse',
        alias: ['qverse', 'ayat'],
        category: 'devotion',
        description: 'Get a specific Quran verse in English',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";

            if (!args[0] || !args[1] || isNaN(args[0]) || isNaN(args[1])) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}quranverse 2 255_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "☪️", key: msg.key } });
                const url = `http://api.alquran.cloud/v1/ayah/${args[0]}:${args[1]}/en.asad`;
                const res = await axios.get(url, { headers });

                if (res.data && res.data.data) {
                    const surahName = res.data.data.surah.englishName;
                    const verseText = res.data.data.text;
                    
                    await sock.sendMessage(jid, { 
                        text: `📖 *The Noble Quran*\n\n*Surah ${surahName} (${args[0]}), Ayat ${args[1]}*\n"${verseText}"\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[QURAN VERSE ERROR]", err.message);
                await sock.sendMessage(jid, { text: `❌ *Verse not found. Check Surah and Ayat numbers.*` }, { quoted: msg });
            }
        }
    },
    {
        name: 'quranchapter',
        alias: ['readquran', 'surah'],
        category: 'devotion',
        description: 'Read a full Surah (Chapter) from the Quran in English',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";
            const chapter = args[0];

            if (!chapter || isNaN(chapter) || chapter < 1 || chapter > 114) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}quranchapter 1_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "📖", key: msg.key } });
                const url = `http://api.alquran.cloud/v1/surah/${chapter}/en.asad`;
                const res = await axios.get(url, { headers });
                
                if (res.data && res.data.data && res.data.data.ayahs) {
                    const surahName = res.data.data.englishName;
                    const versesText = res.data.data.ayahs.map(v => `*${v.numberInSurah}.* ${v.text}`).join("\n\n");
                    
                    await sock.sendMessage(jid, { 
                        text: `📖 *The Noble Quran - Surah ${surahName}*\n\n${versesText}\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[QURAN CHAPTER ERROR]", err.message);
                await sock.sendMessage(jid, { text: "❌ *Could not fetch the Surah API.*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // ✝️ HOLY BIBLE COMMANDS (API)
    // ==========================================
    {
        name: 'bibleverse',
        alias: ['verse'],
        category: 'devotion',
        description: 'Get a specific Bible verse',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";
            const input = args.join(" ").toLowerCase();
            const match = input.match(/(.+?)\s+(\d+)[\s:]+(\d+)/);

            if (!match) return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}bibleverse john 3 16_` }, { quoted: msg });

            const book = match[1].trim().replace(/\s+/g, ""); 
            const chapter = match[2];
            const verse = match[3];

            try {
                await sock.sendMessage(jid, { react: { text: "✝️", key: msg.key } });
                const res = await axios.get(`https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${book}/chapters/${chapter}/verses/${verse}.json`, { headers });
                
                if (res.data && res.data.text) {
                    await sock.sendMessage(jid, { 
                        text: `📖 *Holy Bible (KJV)*\n\n*${match[1].toUpperCase()} ${chapter}:${verse}*\n"${res.data.text}"\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[BIBLE VERSE ERROR]", err.message);
                await sock.sendMessage(jid, { text: `❌ *Verse not found. Check the book name.*` }, { quoted: msg });
            }
        }
    },
    {
        name: 'biblechapter',
        alias: ['readbible'],
        category: 'devotion',
        description: 'Read a full Bible chapter',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const prefix = process.env.PREFIX || ".";
            const input = args.join(" ").toLowerCase();
            const match = input.match(/(.+?)\s+(\d+)$/);

            if (!match) return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: ${prefix}biblechapter john 3_` }, { quoted: msg });

            const book = match[1].trim().replace(/\s+/g, ""); 
            const chapter = match[2];

            try {
                await sock.sendMessage(jid, { react: { text: "📖", key: msg.key } });
                const res = await axios.get(`https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${book}/chapters/${chapter}.json`, { headers });
                
                let versesText = "";
                if (res.data && Array.isArray(res.data.data)) {
                    versesText = res.data.data.map(v => `*${v.verse}.* ${v.text}`).join("\n\n");
                } else if (Array.isArray(res.data)) {
                    versesText = res.data.map(v => `*${v.verse}.* ${v.text}`).join("\n\n");
                }
                
                if (versesText) {
                    await sock.sendMessage(jid, { 
                        text: `📖 *Holy Bible - ${match[1].toUpperCase()} Chapter ${chapter}*\n\n${versesText}\n\n> _Shared by KIRA X MD_` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                console.log("[BIBLE CHAPTER ERROR]", err.message);
                await sock.sendMessage(jid, { text: "❌ *Could not fetch the chapter.*" }, { quoted: msg });
            }
        }
    }
];