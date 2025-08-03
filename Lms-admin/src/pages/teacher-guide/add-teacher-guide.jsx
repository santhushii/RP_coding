import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import AddTeacherGuideForm from '@/components/teacher-guide/AddTeacherGuideForm';

const AddTeacherGuide = () => {
    return (
        <>
            <PageHeader >
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <AddTeacherGuideForm title={"Add Teacher Guide"} />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default AddTeacherGuide;