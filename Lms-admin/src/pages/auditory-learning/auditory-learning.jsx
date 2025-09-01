import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import PageHeaderWidgets from '@/components/shared/pageHeader/PageHeaderWidgets';
import Footer from '@/components/shared/Footer';
import AuditoryLearningTable from '@/components/auditory-learning/AuditoryLearningTable';

const AuditoryLearning = () => {
    return (
        <>
            <PageHeader>
                <PageHeaderWidgets addNewLink="/admin/auditory-learning/create" name="Add New Lecture" />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <AuditoryLearningTable title="Auditory Learning List" />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AuditoryLearning;
