import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Send, Mail, Info, X, LogOut, History } from 'lucide-react';
import MailAnimation from '../../animations/MailAnimation';
import LoadToSIte from '../../animations/LoadToSIte';
import HistorySidebar from '../History/HistorySideBar';
import axios from 'axios';
import toast from 'react-hot-toast';

const SendBulk = () => {
  const { isLoggedIn, logout, emailHistory, setEmailHistory, messageHistory, setMessageHistory, refreshHistory } = useContext(AuthContext);
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

  const [emails, setEmails] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [isMailSent, setIsMailSent] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  const handleLogOut = () => {
    setIsLoggingOut(true);
    isLoggingOutRef.current = true;
    setTimeout(() => {
      logout();
      navigate('/dash', { replace: true });
      // console.log('logging out')
    }, 2500);
    // console.log('Logged out!');
  };

  useEffect(() => {
    document.title = 'Send Mail';
    const token = localStorage.getItem('auth_token');
    if (!isLoggingOutRef.current && (!token || !isLoggedIn)) {
      navigate('/dash', { replace: true });
    }
    refreshHistory();
  }, [isLoggedIn, navigate, refreshHistory]);

  // DB
  // let token = localStorage.getItem('auth_token');
  const saveMessageToDB = async (email, subject, body, smtp_token) => {
    try {
      await axios.post('https://bulk-mail-db-server.onrender.com/message/save-message', {
        // await axios.post('http://localhost:4000/message/save-message', {
        email,
        subject,
        body,
        smtp_token,
      });
      // console.log('credentials to save from front: ', { email, subject, body, token })
    } catch (error) {
      console.error('Error saving message to DB:', error);
    }
  };
  // End of DB

  // History Side Bar
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const toggleHistorySidebar = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const handleEmailSelectFromHistory = (selectedEmails) => {
    setEmails(prevEmails => {
      const updatedEmails = [...prevEmails];
      selectedEmails.forEach(email => {
        if (!updatedEmails.includes(email)) {
          updatedEmails.push(email);
        }
      });
      return updatedEmails;
    });
  };

  const handleMessageSelectFromHistory = (messageOrArray) => {
    const message = Array.isArray(messageOrArray) ? messageOrArray[0] : messageOrArray;
    if (message) {
      setSubject(message.subject);
      setBody(message.body);
    }
  };
  // End of History SideBar

  // Modified input handling functions
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.endsWith(' ')) {
      const newEmail = value.trim();
      if (newEmail && !emails.includes(newEmail)) {
        setEmails(prevEmails => [...prevEmails, newEmail]);
        setCurrentInput('');
      }
    } else {
      setCurrentInput(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const newEmail = currentInput.trim();
      if (newEmail && !emails.includes(newEmail)) {
        setEmails(prevEmails => [...prevEmails, newEmail]);
        setCurrentInput('');
      }
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }
  };

  // Add touch event handlers for mobile
  const handleTouchEnd = (e) => {
    const value = e.target.value;
    if (value.endsWith(' ')) {
      const newEmail = value.trim();
      if (newEmail && !emails.includes(newEmail)) {
        setEmails(prevEmails => [...prevEmails, newEmail]);
        setCurrentInput('');
      }
    }
  };

  const handleRemoveEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  // Handle Pasting into the input field
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newEmails = pastedText.split(/\s+/).filter(email => email);
    newEmails.forEach(email => {
      if (email && !emails.includes(email)) {
        setEmails(prevEmails => [...prevEmails, email]);
      }
    });
    setCurrentInput('');
  };

  // Process email on blur (when the input field loses focus)
  const handleInputBlur = () => {
    if (currentInput.trim()) {
      const newEmails = currentInput
        .trim()
        .split(/\s+/)
        .filter(email => email);
      newEmails.forEach(email => {
        if (!emails.includes(email)) {
          setEmails(prevEmails => [...prevEmails, email]);
        }
      });
    }
    setCurrentInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsSendingMail(true);
    setStatus('Sending...');

    try {
      const token = localStorage.getItem('auth_token');
      // console.log('Token being sent:', token);

      await toast.promise (
        (async () => {
          if (!token) {
            setStatus('Token missing. Please verify again.');
            setLoading(false);
            setIsSendingMail(false);
            return;
          }

          if (emails.length === 0) {
            setStatus('Please enter at least one recipient email.');
            setLoading(false);
            setIsSendingMail(false);
            return;
          }

          // console.log('saving to database')
          // for (const email of emails) {
          //    saveMessageToDB(email, subject, body, token);
          // }

          // const response = await fetch(`http://localhost:5000/api/send-bulk-mail`, {
          const response = await fetch(`https://bulk-mail-server-qa9a.onrender.com/api/send-bulk-mail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            mode: 'cors',
            body: JSON.stringify({
              recipients: emails,
              subject: subject,
              body: body
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send emails: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to send emails');
          }

          setTimeout(() => {
            setStatus(data.success ? `Emails sent successfully to ${emails.length} recipients!` : 'Failed to send emails');
          }, 1000);

          if (data.success) {
            setEmails([]);
            setSubject('');
            setBody('');
            setIsMailSent(true);

            // Save each recipient's message to the database
            for (const email of emails) {
              await saveMessageToDB(email, subject, body, token);
            }
            refreshHistory();

            setTimeout(() => {
              setIsMailSent(false);
              setStatus('');
            }, 500);
          }
        })(),
        {
          loading: 'Sending emails...',
          success: `Emails sent to ${emails.length} recipients successfully!`,
          error: 'Error sending emails',
        }
      )
    } catch (error) {
      setStatus('Error sending emails');
      toast.error('Error sending emails');
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setIsSendingMail(false);
      setEmails([]);
      setSubject('');
      setBody('');
    }
    // setIsSendingMail(true); // remove later
  };

  return (
    <section className='w-full h-full min-h-screen bg-gradient-to-br from-orange-300 to-blue-300'>
      <div id="history" className='flex flex-row items-center justify-between'>
        <div className='flex items-center justify-start pt-5 px-5'>
          <button
            className='flex flex-row items-center justify-between space-x-2 font-semibold cursor-pointer px-3 py-2 rounded-lg bg-gradient-to-br from-orange-500 to-blue-500 hover:bg-gradient-to-br hover:from-orange-600 hover:to-blue-600 transition duration-300 ease-in-out shadow-md shadow-gray-700 text-gray-50'
            onClick={toggleHistorySidebar}
          >
            <History size={20} />
            <span className='text-base md:text-lg'>History</span>
          </button>
        </div>
        <div className='flex items-center justify-end pt-5 px-5'>
          <button onClick={handleLogOut} className='flex flex-row items-center justify-between space-x-2 font-semibold cursor-pointer px-3 py-2 rounded-lg bg-gradient-to-br from-orange-500 to-blue-500 hover:bg-gradient-to-br hover:from-orange-600 hover:to-blue-600 transition duration-300 ease-in-out shadow-md shadow-gray-700 text-gray-50'>
            <LogOut size={20} />
            <span className='text-base md:text-lg'>Log out</span>
          </button>
        </div>
      </div>
      {isLoggingOut && (
        <div className='fixed inset-0 w-[100vw] h-[100vh] overflow-y-hidden'>
          <LoadToSIte loadText='Logging Out...' />
        </div>
      )}
      <div className='w-full h-full py-8 px-3' style={isLoggingOut ? { display: 'none' } : { display: 'block' }}>
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-400">
            <Mail className="text-blue-700" size={24} />
            <h2 className="text-2xl font-extrabold text-gray-900 hero-name tracking-wide -mb-2">Bulk Email Sender</h2>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg mb-6 flex items-start gap-3">
            <Info className="text-blue-700 flex-shrink-0 mt-5 md:mt-4" size={18} />
            <p className="text-sm md:text-base font-medium text-blue-900">
              Enter multiple email addresses. Press space after each email. Make sure all recipients have consented to receive emails.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="email-recipients">
                Recipients
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {emails.map((email, index) => (
                  <span
                    key={index}
                    className="bg-gray-200 text-gray-800 rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id='email-recipients'
                  name="recipients"
                  autoComplete="on"
                  ref={emailInputRef}
                  value={currentInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onTouchEnd={handleTouchEnd}
                  onBlur={handleInputBlur}
                  onPaste={handlePaste}
                  className="flex-grow p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-gray-500 text-base"
                  placeholder="Enter email and press space"
                />
              </div>
              <p className="mt-1 text-base font-medium text-blue-600">Enter emails and press space</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="email-subject">
                Subject Line
              </label>
              <input
                type="text"
                id='email-subject'
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-gray-500 text-lg"
                placeholder="Enter the email subject"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="email-body">
                Email Content
              </label>
              <textarea
                name="body"
                id='email-body'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-gray-500"
                rows="8"
                placeholder="Type your message here..."
                required
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || emails.length === 0 || isSendingMail}
                className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-md font-medium
                  ${
                    loading || emails.length === 0 || isSendingMail
                      ? 'opacity-70 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-blue-700 active:bg-blue-800'
                  }
                  transition-all shadow-md`}
              >
                {loading || isSendingMail ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Send Bulk Emails</span>
                  </>
                )}
              </button>
            </div>
            {/* {status && (
              <div className={`mt-4 p-4 rounded-md flex items-center gap-3 ${
                status.includes('success')
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-red-100 text-red-800 border-2 border-red-300'
              }`}>
                <div className={`rounded-full p-1 ${status.includes('success') ? 'bg-green-300' : 'bg-red-300'}`}>
                  {status.includes('success') ? '✓' : '!'}
                </div>
                <div className="font-medium">{status}</div>
              </div>
            )} */}
          </form>
        </div>
      </div>
      {isSendingMail && (
        <div className="z-50 fixed top-0 left-0 w-full h-full bg-transparent">
          <MailAnimation isSending={isSendingMail} isSent={isMailSent} />
        </div>
      )}
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={toggleHistorySidebar}
        emailHistory={emailHistory}
        messageHistory={messageHistory}
        onEmailSelect={handleEmailSelectFromHistory}
        onMessageSelect={handleMessageSelectFromHistory}
        setEmailHistory={setEmailHistory}
        setMessageHistory={setMessageHistory}
      />
    </section>
  );
};

export default SendBulk;