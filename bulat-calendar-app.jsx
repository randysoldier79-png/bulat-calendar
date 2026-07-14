import React, { useState, useEffect } from 'react';
import './BulatCalendar.css';

// ВАЖНО: Firebase конфиг нужно добавить в начало файла
// Ты получишь эти данные из своего Firebase проекта

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const BulatCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 14)); // Июль 2026
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fio: '',
    address: '',
    phone: '',
    smeta: '',
    status: '',
    files: [],
    link3d: '',
    notes: ''
  });
  const [db, setDb] = useState(null);
  const [storage, setStorage] = useState(null);

  // Инициализация Firebase
  useEffect(() => {
    const firebaseConfig = {
      apiKey: "AIzaSyCh8MVn1MaKSnmxhFOn3Iwn6IIJwto9drY",
      authDomain: "bulat-calendar.firebaseapp.com",
      projectId: "bulat-calendar",
      storageBucket: "bulat-calendar.firebasestorage.app",
      messagingSenderId: "117566548738",
      appId: "1:117566548738:web:9765c7bf56df0258bf301b",
      measurementId: "G-08KS27RCWK"
    };

    try {
      const app = initializeApp(firebaseConfig);
      setDb(getFirestore(app));
      setStorage(getStorage(app));
    } catch (error) {
      console.log('Firebase уже инициализирован или ошибка:', error);
    }
  }, []);

  // Загрузить заказы из Firebase
  const loadOrders = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const loadedOrders = [];
      querySnapshot.forEach((doc) => {
        loadedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(loadedOrders);
    } catch (error) {
      console.log('Ошибка загрузки:', error);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [db]);

  // Дни в месяце
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Первый день недели
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Месяцы и годы
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // Получить заказы на конкретную дату
  const getOrdersForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return orders.filter(order => order.date === dateStr);
  };

  // Обработка клика по дате
  const handleDateClick = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate({ day, dateStr });
    setShowForm(true);
    setFormData({ fio: '', address: '', phone: '', smeta: '', status: '', files: [], link3d: '', notes: '' });
  };

  // Сохранить заказ
  const handleSaveOrder = async () => {
    if (!formData.fio || !formData.address || !formData.phone || !formData.status) {
      alert('Заполни все обязательные поля');
      return;
    }

    try {
      const newOrder = {
        fio: formData.fio,
        address: formData.address,
        phone: formData.phone,
        smeta: formData.smeta,
        status: formData.status,
        link3d: formData.link3d,
        notes: formData.notes,
        date: selectedDate.dateStr,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      
      // Загрузить файлы в Firebase Storage
      if (formData.files.length > 0) {
        for (let file of formData.files) {
          const fileRef = ref(storage, `orders/${docRef.id}/${file.name}`);
          await uploadBytes(fileRef, file);
        }
      }

      setOrders([...orders, { id: docRef.id, ...newOrder }]);
      setShowForm(false);
      alert('Заказ сохранён!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении. Проверь Firebase настройки.');
    }
  };

  // Удалить заказ
  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Удалить заказ?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        setOrders(orders.filter(order => order.id !== orderId));
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  // Обработка файлов
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, files: [...formData.files, ...files] });
  };

  // Предыдущий месяц
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  // Следующий месяц
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Создать дни календаря
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Пустые клетки до первого дня месяца
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOrders = getOrdersForDate(day);
      const hasZamery = dayOrders.some(o => o.status === 'Замер');
      const hasMontaz = dayOrders.some(o => o.status === 'Монтаж');

      days.push(
        <div key={day} className="calendar-day" onClick={() => handleDateClick(day)}>
          <div className="day-number">{day}</div>
          <div className="day-dots">
            {hasZamery && <div className="dot zamery"></div>}
            {hasMontaz && <div className="dot montaz"></div>}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bulat-calendar">
      <div className="header">
        <button onClick={prevMonth}>←</button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={nextMonth}>→</button>
      </div>

      <div className="calendar">
        {dayNames.map(day => <div key={day} className="day-header">{day}</div>)}
        {renderCalendar()}
      </div>

      {selectedDate && (
        <div className="sidebar">
          <h3>{selectedDate.day} {monthNames[currentDate.getMonth()]}</h3>
          
          {showForm ? (
            <div className="form">
              <input
                type="text"
                placeholder="ФИО клиента"
                value={formData.fio}
                onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
              />
              <input
                type="text"
                placeholder="Адрес"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Номер телефона"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <div className="smeta-input">
                <input
                  type="number"
                  placeholder="Сумма"
                  value={formData.smeta}
                  onChange={(e) => setFormData({ ...formData, smeta: e.target.value })}
                />
                <span>₽</span>
              </div>
              
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="">Выбери статус</option>
                <option value="Замер">Замер</option>
                <option value="Монтаж">Монтаж</option>
              </select>

              <input
                type="text"
                placeholder="Ссылка на 3D проект"
                value={formData.link3d}
                onChange={(e) => setFormData({ ...formData, link3d: e.target.value })}
              />

              <textarea
                placeholder="Заметки"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              ></textarea>

              <label className="file-label">
                Загрузить файлы (КП, дизайн)
                <input type="file" multiple onChange={handleFileChange} />
              </label>

              {formData.files.length > 0 && (
                <div className="files-list">
                  {formData.files.map((file, idx) => (
                    <span key={idx}>{file.name}</span>
                  ))}
                </div>
              )}

              <button onClick={handleSaveOrder} className="btn-save">Сохранить</button>
              <button onClick={() => setShowForm(false)} className="btn-cancel">Отмена</button>
            </div>
          ) : (
            <div className="orders-list">
              {getOrdersForDate(selectedDate.day).length === 0 ? (
                <p>Нет заказов</p>
              ) : (
                getOrdersForDate(selectedDate.day).map((order) => (
                  <div key={order.id} className={`order-item status-${order.status === 'Замер' ? 'zamery' : 'montaz'}`}>
                    <strong>{order.fio}</strong>
                    <p>{order.address}</p>
                    <p>{order.phone}</p>
                    {order.smeta && <p className="smeta">{order.smeta} ₽</p>}
                    {order.link3d && (
                      <a href={order.link3d} target="_blank" rel="noopener noreferrer" className="link3d">
                        🔗 3D Проект
                      </a>
                    )}
                    {order.notes && <p className="notes">📝 {order.notes}</p>}
                    <button onClick={() => handleDeleteOrder(order.id)} className="btn-delete">Удалить</button>
                  </div>
                ))
              )}
              <button onClick={() => setShowForm(true)} className="btn-add">+ Новый заказ</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulatCalendar;
