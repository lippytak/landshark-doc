var data = {
  'prospectiveCaseNumberVerbatim': null,
  'prospectiveCaseNumber': null, // normalized
  'prospectiveDefendantName': null,

  'caseNumber': null,
  'defendantName': null,
  'courtDate': null,
  'courtTime': null,

  'suspendedCaseNumber': null,

  'clerkPhone': '502-111-2222',

  'lastFourCaseNumber' : null,
  'reportDate' : null,
  'HSAPhone' : '(415) 555-5555',

  waitingForReminders: false
};

var CASES = {
  //valid case
  '4444': {
    reportDate: 'Wed, May 15th',
    phoneNumber: '4155555555',
  },
  //valid case
  '2222': {
    reportDate: 'Fri, July 21st',
    phoneNumber: '4155555555',
  },
  //phone mismatch
  '1111': {
    reportDate: 'May 15th',
    phoneNumber: '4155555555',
    phoneMismatch: true,
  },
  //missing report date
  '3333': {
    reportDate: 'Thu, July 11th',
    phoneNumber: '4155555555',
    missingReportDate: true,
  },  
};

var CASE_NUMBER_NO_WIDTH = 6;
// var CASE_NUMBER_REGEXP = /(\d[1-9]?)-?([A-Za-z])-?(\d{0,5}[1-9])-?(\d{0,2}[1-9])?/;
var CASE_NUMBER_REGEXP = /^\d{4}$/;
var INPUT_REGEXP = /^\d+$/;

var STATES = {
  // Initial state, ready for user input
  'ready': {
    //cheatText: "<p>Imagine you’re seeing this poster, and holding your phone in your hand. What would you do?</p><img src='../ux/mocks/physical/business-card.png'>",
    cheatText: "<p>Don't forget your CalFresh reports! Text the last FOUR digits of your case number to us and we'll remind you with a text message.</p>",
    onEntry: function() {
      data.waitingForReminders = false;
    }
  },

  'look-up-case': {
    onEntry: function() {
      data.prospectiveCaseNumber = 
        normalizeCaseNumber(data.prospectiveCaseNumberVerbatim);

      if (!CASES[data.prospectiveCaseNumber]) {
        changeState('cannot-find-case');
      } else if (CASES[data.prospectiveCaseNumber].phoneMismatch) {
        changeState('phone-mismatch');
      } else if (CASES[data.prospectiveCaseNumber].missingReportDate) {
        changeState('no-report-date');
      } else {
      data.reportDate = CASES[data.prospectiveCaseNumber].reportDate;
      changeState('verify-case'); 
      }
    }
  },

  'invalid-case-number': {
    onEntry: function() {
      sendReply('invalid-case-number');
      changeState('ready');
    }
  },

  'phone-mismatch': {
    onEntry: function() {
      sendReply('phone-mismatch');
      changeState('ready');
    }
  },

  'cannot-find-case': {
    onEntry: function() {
      sendReply('cannot-find-case');
      changeState('ready');
    }
  },

  'no-report-date': {
    onEntry: function() {
      sendReply('verify-case-no-report-date');
      changeState('verify-case-logic');
    }
  },

  'verify-case': {
    onEntry: function() {
      sendReply('verify-case');
      changeState('verify-case-logic');
    },
  },

  'case-not-confirmed': {
    onEntry: function() {
      sendReply('no-confirmation');
      changeState('ready');
    }
  },

  'case-confirmed': {
    onEntry: function() {
      data.caseNumber = data.prospectiveCaseNumber;
      data.defendantName = data.prospectiveDefendantName;
      data.courtTime = CASES[data.caseNumber].courtTime;
      data.courtDate = CASES[data.caseNumber].courtDate;

      data.suspendedCaseNumber = null;      

      sendReply('confirmation');
      changeState('waiting-for-reminders');
    }
  },

  'verify-case-logic': {
    onTextMessage: function(input) {
      switch (input) {
        case 'Y':
        case 'YES':
        case 'YEAH':
        case 'YEP':
          changeState('case-confirmed')
          break;
        case 'N':
        case 'NO':
        case 'NOPE':
          changeState('case-not-confirmed');
          break;
        default:
          changeState('404');
          break;
      }
    }
  },

  'waiting-for-reminders': {
    cheatActions: [
      { name: 'Fast forward time to 1 week before', state: 'waiting-for-reminders-1-week-before' }
    ],
    onEntry: function() {
      data.waitingForReminders = true;
    },
  },

  'waiting-for-reminders-1-week-before': {
    cheatText: "<p>Try texting STOP or HELP</p>",
    onEntry: function() {
      advanceTime('One week before report is due...');
      sendReply('reminder-week-before');
      data.waitingForReminders = true;
    },
    onTextMessage: function() {
      sendReply('404');
    }
  },

  'unsubscribe': {
    onEntry: function() {
      if (data.waitingForReminders) {
        sendReply('unsubscribe');
        data.suspendedCaseNumber = data.caseNumber;
        changeState('ready');
      } else {
        sendReply('404');
        changeToPreviousState();
      }
    }
  },

  '404': {
    onEntry: function() {
      sendReply('404');
      changeToPreviousState();
    }
  }
};

function handleGlobalInput(text) {
  var handled = true;

  if (validCaseNumber(text)) {
    data.prospectiveCaseNumberVerbatim = text;
    changeState('look-up-case');
  } else if (validInput(text)) {
    sendReply('invalid-case-number');
    changeState('ready');
  } else {
    switch (text) {
      case 'STOP':
        changeState('unsubscribe');
        break;
      case 'HELP':
        sendReply('help');
        changeToPreviousState();
        break;

      /*case 'HELP':
      case '?':
        if (data.waitingForReminders) {
          changeState('help-waiting');
        } else {
          changeState('help-not-waiting');        
        }
        break;*/
      default:
        handled = false;
        break;
    }
  }
  return handled;
}

function normalizeCaseNumber(caseNumberVerbatim) {
  // var caseNumberMatch = caseNumberVerbatim.match(CASE_NUMBER_REGEXP);

  // var caseNumberSplit = {};
  // caseNumberSplit.year = parseInt(caseNumberMatch[1]);
  // caseNumberSplit.type = caseNumberMatch[2];
  // caseNumberSplit.number = '' + parseInt(caseNumberMatch[3]);
  // caseNumberSplit.codefendant = parseInt(caseNumberMatch[4]);

  // while (caseNumberSplit.number.length < CASE_NUMBER_NO_WIDTH) {
  //   caseNumberSplit.number = '0' + caseNumberSplit.number;
  // }

  // return caseNumberSplit.year + '-' + 
  //     caseNumberSplit.type + '-' + caseNumberSplit.number;  
  return caseNumberVerbatim;
}

function validCaseNumber(caseNumber) {
  return caseNumber.match(CASE_NUMBER_REGEXP);
}

function validInput(text) {
  return text.match(INPUT_REGEXP);
}