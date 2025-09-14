import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import PageHeaderWidgets from '@/components/shared/pageHeader/PageHeaderWidgets';
import Footer from '@/components/shared/Footer';
import TeacherGuideFeedbackTable from '@/components/teacher-guide/TeacherGuideFeedbackTable';

const TeacherGuideFeedback = () => {
    return (
        <>
            <PageHeader>
                {/* <PageHeaderWidgets addNewLink="/admin/teacher-guide/create" name="Add New Guide" /> */}
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <TeacherGuideFeedbackTable title="Teacher Guide Suggest" />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default TeacherGuideFeedback;
