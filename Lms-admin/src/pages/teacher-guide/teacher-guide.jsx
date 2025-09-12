import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import PageHeaderWidgets from '@/components/shared/pageHeader/PageHeaderWidgets';
import Footer from '@/components/shared/Footer';
import TeacherGuideTable from '@/components/teacher-guide/TeacherGuideTable';

const TeacherGuide = () => {
    return (
        <>
            <PageHeader>
                <PageHeaderWidgets addNewLink="/admin/teacher-guide/create" name="Add New Guide" />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <TeacherGuideTable title="Teacher Guide List" />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default TeacherGuide;
